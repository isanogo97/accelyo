/**
 * Service du portail etudiant (app mobile/PWA).
 * ----------------------------------------------------------------
 * Fonctions pures consommant Prisma. Aucune dependance externe,
 * aucune sortie reseau: tout vit dans PostgreSQL auto-heberge.
 *
 * Chaque fonction est scopee a un etudiant (et donc a son universite):
 * un etudiant ne voit que ses propres donnees et celles de son tenant.
 */
import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError } from '../../utils/errors';

/** Nombre de jours ajoutes a chaque prolongation de pret. */
const RENEWAL_DAYS = 14;

interface StudentContext {
  id: string;
  universityId: string;
  program: string | null;
}

/**
 * Charge l'etudiant + son universite. Sert de socle a toutes les
 * requetes du portail (scope tenant + filtre programme).
 */
async function loadStudent(studentId: string): Promise<{
  ctx: StudentContext;
  sector: string;
}> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { university: true },
  });
  if (!student) {
    throw new NotFoundError('Etudiant introuvable');
  }
  return {
    ctx: {
      id: student.id,
      universityId: student.universityId,
      program: student.program,
    },
    sector: student.university.sector,
  };
}

export interface ScheduleEntryDto {
  id: string;
  title: string;
  location: string | null;
  teacher: string | null;
  startsAt: Date;
  endsAt: Date;
}

/**
 * Emploi du temps de l'etudiant sur une fenetre [from, to].
 * Inclut les cours qui lui sont propres (studentId = lui) et ceux
 * a l'echelle de l'universite (studentId null), filtres par programme.
 */
export async function getSchedule(
  studentId: string,
  from: Date,
  to: Date,
): Promise<{ entries: ScheduleEntryDto[] }> {
  const { ctx } = await loadStudent(studentId);

  const rows = await prisma.scheduleEntry.findMany({
    where: {
      universityId: ctx.universityId,
      OR: [{ studentId: ctx.id }, { studentId: null }],
      AND: [{ OR: [{ program: null }, { program: ctx.program }] }],
      startsAt: { gte: from, lte: to },
    },
    orderBy: { startsAt: 'asc' },
  });

  const entries: ScheduleEntryDto[] = (rows as ScheduleEntryDto[]).map(
    (r) => ({
      id: r.id,
      title: r.title,
      location: r.location,
      teacher: r.teacher,
      startsAt: r.startsAt,
      endsAt: r.endsAt,
    }),
  );

  return { entries };
}

export interface NewsItemDto {
  id: string;
  title: string;
  body: string;
  category: string | null;
  publishedAt: Date;
  isPinned: boolean;
}

/**
 * Annonces de l'universite de l'etudiant, non expirees.
 * Tri: epinglees d'abord, puis les plus recentes.
 */
export async function getNews(
  studentId: string,
): Promise<{ items: NewsItemDto[] }> {
  const { ctx } = await loadStudent(studentId);
  const now = new Date();

  const rows = await prisma.announcement.findMany({
    where: {
      universityId: ctx.universityId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
    take: 50,
  });

  const items: NewsItemDto[] = (rows as NewsItemDto[]).map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    category: r.category,
    publishedAt: r.publishedAt,
    isPinned: r.isPinned,
  }));

  return { items };
}

export interface LoanDto {
  id: string;
  bookTitle: string;
  bookAuthor: string | null;
  borrowedAt: Date;
  dueAt: Date;
  returnedAt: Date | null;
  renewedCount: number;
  maxRenewals: number;
  canRenew: boolean;
}

interface LoanRow {
  id: string;
  bookTitle: string;
  bookAuthor: string | null;
  borrowedAt: Date;
  dueAt: Date;
  returnedAt: Date | null;
  renewedCount: number;
  maxRenewals: number;
}

/** Mappe une ligne de pret vers le DTO, en calculant canRenew. */
function toLoanDto(r: LoanRow): LoanDto {
  return {
    id: r.id,
    bookTitle: r.bookTitle,
    bookAuthor: r.bookAuthor,
    borrowedAt: r.borrowedAt,
    dueAt: r.dueAt,
    returnedAt: r.returnedAt,
    renewedCount: r.renewedCount,
    maxRenewals: r.maxRenewals,
    canRenew: r.returnedAt === null && r.renewedCount < r.maxRenewals,
  };
}

/**
 * Prets de bibliotheque de l'etudiant.
 * Tri: non rendus d'abord, puis par echeance croissante.
 */
export async function getLoans(
  studentId: string,
): Promise<{ sector: string; loans: LoanDto[] }> {
  const { ctx, sector } = await loadStudent(studentId);

  const rows = await prisma.libraryLoan.findMany({
    where: { studentId: ctx.id },
    orderBy: [{ returnedAt: { sort: 'asc', nulls: 'first' } }, { dueAt: 'asc' }],
  });

  return { sector, loans: (rows as LoanRow[]).map(toLoanDto) };
}

/**
 * Prolonge un pret de l'etudiant de RENEWAL_DAYS jours.
 * 404 si le pret n'existe pas ou n'appartient pas a l'etudiant.
 * 400 si la prolongation n'est pas autorisee (rendu ou quota atteint).
 */
export async function renewLoan(
  studentId: string,
  loanId: string,
): Promise<{ loan: LoanDto }> {
  const { ctx } = await loadStudent(studentId);

  const loan = await prisma.libraryLoan.findUnique({ where: { id: loanId } });
  if (!loan || loan.studentId !== ctx.id) {
    throw new NotFoundError('Pret introuvable');
  }

  const canRenew =
    loan.returnedAt === null && loan.renewedCount < loan.maxRenewals;
  if (!canRenew) {
    throw new BadRequestError('Prolongation impossible');
  }

  const newDueAt = new Date(loan.dueAt.getTime() + RENEWAL_DAYS * 24 * 60 * 60 * 1000);
  const updated = await prisma.libraryLoan.update({
    where: { id: loan.id },
    data: { dueAt: newDueAt, renewedCount: loan.renewedCount + 1 },
  });

  return { loan: toLoanDto(updated) };
}

export interface DealDto {
  id: string;
  title: string;
  description: string | null;
  partner: string | null;
  category: string | null;
  url: string | null;
  code: string | null;
  expiresAt: Date | null;
}

/**
 * Bons plans visibles par l'etudiant: ceux de son universite + les
 * offres globales (universityId null), actifs et non expires.
 */
export async function getDeals(
  studentId: string,
): Promise<{ deals: DealDto[] }> {
  const { ctx } = await loadStudent(studentId);
  const now = new Date();

  const rows = await prisma.deal.findMany({
    where: {
      OR: [{ universityId: ctx.universityId }, { universityId: null }],
      isActive: true,
      AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }],
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const deals: DealDto[] = (rows as DealDto[]).map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    partner: r.partner,
    category: r.category,
    url: r.url,
    code: r.code,
    expiresAt: r.expiresAt,
  }));

  return { deals };
}
