/**
 * Service du module Contenu (planning, infos, bibliotheque, bons plans).
 * ----------------------------------------------------------------
 * Toutes les operations sont SCOPEES par universityId (multi-tenant).
 * Le controleur resout l'universityId effectif (force au tenant du caller
 * pour un non-super, fourni explicitement pour le SUPER_ADMIN) et le passe
 * ici. Ce service NE FAIT PAS confiance a un universityId venant du body.
 *
 * Verif de propriete (assert*Ownership): charge la ressource et 404 si elle
 * n'appartient pas a l'universityId attendu. Pour le SUPER_ADMIN, le
 * controleur passe l'universityId reel de la ressource (pas de bypass ici).
 */

import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError } from '../../utils/errors';

// ---------------------------------------------------------------------------
// Announcements (infos / annonces)
// ---------------------------------------------------------------------------

export interface AnnouncementInput {
  title: string;
  body: string;
  category?: string | null;
  isPinned?: boolean;
  publishedAt?: Date;
  expiresAt?: Date | null;
}

export async function listAnnouncements(universityId: string) {
  return prisma.announcement.findMany({
    where: { universityId },
    orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
  });
}

export async function createAnnouncement(
  universityId: string,
  data: AnnouncementInput,
) {
  return prisma.announcement.create({
    data: {
      universityId,
      title: data.title,
      body: data.body,
      category: data.category ?? null,
      isPinned: data.isPinned ?? false,
      ...(data.publishedAt ? { publishedAt: data.publishedAt } : {}),
      expiresAt: data.expiresAt ?? null,
    },
  });
}

export async function updateAnnouncement(
  id: string,
  universityId: string,
  data: Partial<AnnouncementInput>,
) {
  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing || existing.universityId !== universityId) {
    throw new NotFoundError('Annonce introuvable');
  }
  return prisma.announcement.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.body !== undefined ? { body: data.body } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.isPinned !== undefined ? { isPinned: data.isPinned } : {}),
      ...(data.publishedAt !== undefined ? { publishedAt: data.publishedAt } : {}),
      ...(data.expiresAt !== undefined ? { expiresAt: data.expiresAt } : {}),
    },
  });
}

export async function deleteAnnouncement(id: string, universityId: string) {
  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing || existing.universityId !== universityId) {
    throw new NotFoundError('Annonce introuvable');
  }
  await prisma.announcement.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// Schedule (planning)
// ---------------------------------------------------------------------------

export interface ScheduleInput {
  title: string;
  startsAt: Date;
  endsAt: Date;
  location?: string | null;
  teacher?: string | null;
  program?: string | null;
  studentId?: string | null;
}

export async function listSchedule(
  universityId: string,
  range?: { from?: Date; to?: Date },
) {
  return prisma.scheduleEntry.findMany({
    where: {
      universityId,
      ...(range?.from || range?.to
        ? {
            startsAt: {
              ...(range.from ? { gte: range.from } : {}),
              ...(range.to ? { lte: range.to } : {}),
            },
          }
        : {}),
    },
    orderBy: { startsAt: 'asc' },
  });
}

/** Verifie qu'un studentId (s'il est fourni) appartient bien au tenant. */
async function assertStudentInTenant(
  studentId: string | null | undefined,
  universityId: string,
): Promise<void> {
  if (!studentId) return;
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student || student.universityId !== universityId) {
    throw new BadRequestError('Etudiant hors perimetre');
  }
}

export async function createSchedule(
  universityId: string,
  data: ScheduleInput,
) {
  await assertStudentInTenant(data.studentId, universityId);
  return prisma.scheduleEntry.create({
    data: {
      universityId,
      title: data.title,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      location: data.location ?? null,
      teacher: data.teacher ?? null,
      program: data.program ?? null,
      studentId: data.studentId ?? null,
    },
  });
}

export async function updateSchedule(
  id: string,
  universityId: string,
  data: Partial<ScheduleInput>,
) {
  const existing = await prisma.scheduleEntry.findUnique({ where: { id } });
  if (!existing || existing.universityId !== universityId) {
    throw new NotFoundError('Creneau introuvable');
  }
  if (data.studentId !== undefined) {
    await assertStudentInTenant(data.studentId, universityId);
  }
  return prisma.scheduleEntry.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.startsAt !== undefined ? { startsAt: data.startsAt } : {}),
      ...(data.endsAt !== undefined ? { endsAt: data.endsAt } : {}),
      ...(data.location !== undefined ? { location: data.location } : {}),
      ...(data.teacher !== undefined ? { teacher: data.teacher } : {}),
      ...(data.program !== undefined ? { program: data.program } : {}),
      ...(data.studentId !== undefined ? { studentId: data.studentId } : {}),
    },
  });
}

export async function deleteSchedule(id: string, universityId: string) {
  const existing = await prisma.scheduleEntry.findUnique({ where: { id } });
  if (!existing || existing.universityId !== universityId) {
    throw new NotFoundError('Creneau introuvable');
  }
  await prisma.scheduleEntry.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// Library loans (bibliotheque)
// ---------------------------------------------------------------------------

export interface LoanInput {
  studentId: string;
  bookTitle: string;
  bookAuthor?: string | null;
  isbn?: string | null;
  dueAt: Date;
  borrowedAt?: Date;
  maxRenewals?: number;
}

export interface LoanUpdateInput {
  returnedAt?: Date | null;
  dueAt?: Date;
  renewedCount?: number;
  bookTitle?: string;
  bookAuthor?: string | null;
  isbn?: string | null;
  maxRenewals?: number;
}

export async function listLoans(
  universityId: string,
  studentId?: string,
) {
  return prisma.libraryLoan.findMany({
    where: { universityId, ...(studentId ? { studentId } : {}) },
    orderBy: { dueAt: 'asc' },
  });
}

export async function createLoan(universityId: string, data: LoanInput) {
  await assertStudentInTenant(data.studentId, universityId);
  return prisma.libraryLoan.create({
    data: {
      universityId,
      studentId: data.studentId,
      bookTitle: data.bookTitle,
      bookAuthor: data.bookAuthor ?? null,
      isbn: data.isbn ?? null,
      dueAt: data.dueAt,
      ...(data.borrowedAt ? { borrowedAt: data.borrowedAt } : {}),
      ...(data.maxRenewals !== undefined ? { maxRenewals: data.maxRenewals } : {}),
    },
  });
}

export async function updateLoan(
  id: string,
  universityId: string,
  data: LoanUpdateInput,
) {
  const existing = await prisma.libraryLoan.findUnique({ where: { id } });
  if (!existing || existing.universityId !== universityId) {
    throw new NotFoundError('Pret introuvable');
  }
  return prisma.libraryLoan.update({
    where: { id },
    data: {
      ...(data.returnedAt !== undefined ? { returnedAt: data.returnedAt } : {}),
      ...(data.dueAt !== undefined ? { dueAt: data.dueAt } : {}),
      ...(data.renewedCount !== undefined ? { renewedCount: data.renewedCount } : {}),
      ...(data.bookTitle !== undefined ? { bookTitle: data.bookTitle } : {}),
      ...(data.bookAuthor !== undefined ? { bookAuthor: data.bookAuthor } : {}),
      ...(data.isbn !== undefined ? { isbn: data.isbn } : {}),
      ...(data.maxRenewals !== undefined ? { maxRenewals: data.maxRenewals } : {}),
    },
  });
}

export async function deleteLoan(id: string, universityId: string) {
  const existing = await prisma.libraryLoan.findUnique({ where: { id } });
  if (!existing || existing.universityId !== universityId) {
    throw new NotFoundError('Pret introuvable');
  }
  await prisma.libraryLoan.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// Deals (bons plans)
// ---------------------------------------------------------------------------

export interface DealInput {
  title: string;
  description?: string | null;
  partner?: string | null;
  category?: string | null;
  url?: string | null;
  code?: string | null;
  isActive?: boolean;
  startsAt?: Date | null;
  expiresAt?: Date | null;
}

export async function listDeals(universityId: string) {
  return prisma.deal.findMany({
    where: { universityId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createDeal(universityId: string, data: DealInput) {
  return prisma.deal.create({
    data: {
      universityId,
      title: data.title,
      description: data.description ?? null,
      partner: data.partner ?? null,
      category: data.category ?? null,
      url: data.url ?? null,
      code: data.code ?? null,
      isActive: data.isActive ?? true,
      startsAt: data.startsAt ?? null,
      expiresAt: data.expiresAt ?? null,
    },
  });
}

export async function updateDeal(
  id: string,
  universityId: string,
  data: Partial<DealInput>,
) {
  const existing = await prisma.deal.findUnique({ where: { id } });
  if (!existing || existing.universityId !== universityId) {
    throw new NotFoundError('Bon plan introuvable');
  }
  return prisma.deal.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.partner !== undefined ? { partner: data.partner } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.url !== undefined ? { url: data.url } : {}),
      ...(data.code !== undefined ? { code: data.code } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      ...(data.startsAt !== undefined ? { startsAt: data.startsAt } : {}),
      ...(data.expiresAt !== undefined ? { expiresAt: data.expiresAt } : {}),
    },
  });
}

export async function deleteDeal(id: string, universityId: string) {
  const existing = await prisma.deal.findUnique({ where: { id } });
  if (!existing || existing.universityId !== universityId) {
    throw new NotFoundError('Bon plan introuvable');
  }
  await prisma.deal.delete({ where: { id } });
}
