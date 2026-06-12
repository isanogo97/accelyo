/**
 * Controleur du module Contenu.
 * ----------------------------------------------------------------
 * SCOPE TENANT (regle centrale, appliquee a CHAQUE handler):
 *   - non-super (UNIVERSITY_ADMIN / CONTENT_EDITOR): universityId est FORCE
 *     a req.auth.universityId. Tout universityId fourni dans le body/query
 *     est IGNORE. Impossible de viser un autre tenant.
 *   - SUPER_ADMIN: universityId DOIT etre fourni (query pour GET, body pour
 *     POST). 400 sinon.
 *
 * VERIF PROPRIETE (PATCH/DELETE): le service charge la ressource et 404 si
 * elle n'appartient pas a l'universityId passe. Pour le SUPER_ADMIN, on
 * resout d'abord l'universityId reel de la ressource (resolveOwnerUniversity)
 * de sorte que la verif passe pour n'importe quel tenant -> bypass effectif.
 */

import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Role, AuditAction } from '@accelyo/shared';
import { prisma } from '../../config/database';
import { writeAudit } from '../../middleware/audit';
import { respondOk, respondCreated, respondNoContent } from '../../utils/respond';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import * as svc from './content.service';

// --- Resolution du tenant effectif -----------------------------------------

/** universityId effectif pour une LECTURE/CREATION (GET/POST). */
function resolveScopeUniversityId(req: Request, source: 'query' | 'body'): string {
  const auth = req.auth!;
  if (auth.role === Role.SUPER_ADMIN) {
    const raw =
      source === 'query'
        ? (req.query.universityId as string | undefined)
        : ((req.body as Record<string, unknown>)?.universityId as string | undefined);
    if (!raw || typeof raw !== 'string') {
      throw new BadRequestError('universityId requis (SUPER_ADMIN)');
    }
    return raw;
  }
  // Non-super: FORCE au tenant du token (ignore tout universityId fourni).
  if (!auth.universityId) {
    throw new BadRequestError('Compte sans universite');
  }
  return auth.universityId;
}

/**
 * Pour PATCH/DELETE: renvoie l'universityId a utiliser pour la verif de
 * propriete. Non-super -> son tenant. SUPER_ADMIN -> l'universityId reel de
 * la ressource (chargee via `loader`), ce qui rend la verif transparente.
 */
async function resolveOwnerUniversityId(
  req: Request,
  loader: (id: string) => Promise<{ universityId: string | null } | null>,
  id: string,
): Promise<string> {
  const auth = req.auth!;
  if (auth.role === Role.SUPER_ADMIN) {
    const resource = await loader(id);
    if (!resource || !resource.universityId) {
      throw new NotFoundError('Ressource introuvable');
    }
    return resource.universityId;
  }
  if (!auth.universityId) {
    throw new BadRequestError('Compte sans universite');
  }
  return auth.universityId;
}

function audit(
  req: Request,
  op: 'create' | 'update' | 'delete',
  resourceType: string,
  resourceId: string,
) {
  writeAudit(req, {
    action: AuditAction.UNIVERSITY_UPDATED,
    resourceType,
    resourceId,
    metadata: { module: 'content', op },
  });
}

// --- Zod helpers ------------------------------------------------------------

const isoDate = z
  .string()
  .datetime({ offset: true })
  .or(z.string().datetime())
  .transform((s) => new Date(s));

// ===========================================================================
// Announcements
// ===========================================================================

const announcementCreateSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  category: z.string().max(80).nullish(),
  isPinned: z.boolean().optional(),
  publishedAt: isoDate.optional(),
  expiresAt: isoDate.nullish(),
});
const announcementUpdateSchema = announcementCreateSchema.partial();

export async function getAnnouncements(req: Request, res: Response, next: NextFunction) {
  try {
    const universityId = resolveScopeUniversityId(req, 'query');
    const items = await svc.listAnnouncements(universityId);
    respondOk(res, { items });
  } catch (e) {
    next(e);
  }
}

export async function postAnnouncement(req: Request, res: Response, next: NextFunction) {
  try {
    const universityId = resolveScopeUniversityId(req, 'body');
    const data = announcementCreateSchema.parse(req.body);
    const item = await svc.createAnnouncement(universityId, data);
    audit(req, 'create', 'Announcement', item.id);
    respondCreated(res, { item });
  } catch (e) {
    next(e);
  }
}

export async function patchAnnouncement(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    const universityId = await resolveOwnerUniversityId(
      req,
      (x) => prisma.announcement.findUnique({ where: { id: x }, select: { universityId: true } }),
      id,
    );
    const data = announcementUpdateSchema.parse(req.body);
    const item = await svc.updateAnnouncement(id, universityId, data);
    audit(req, 'update', 'Announcement', id);
    respondOk(res, { item });
  } catch (e) {
    next(e);
  }
}

export async function deleteAnnouncementCtrl(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    const universityId = await resolveOwnerUniversityId(
      req,
      (x) => prisma.announcement.findUnique({ where: { id: x }, select: { universityId: true } }),
      id,
    );
    await svc.deleteAnnouncement(id, universityId);
    audit(req, 'delete', 'Announcement', id);
    respondNoContent(res);
  } catch (e) {
    next(e);
  }
}

// ===========================================================================
// Schedule
// ===========================================================================

const scheduleCreateSchema = z
  .object({
    title: z.string().min(1).max(200),
    location: z.string().max(160).nullish(),
    teacher: z.string().max(160).nullish(),
    startsAt: isoDate,
    endsAt: isoDate,
    program: z.string().max(160).nullish(),
    studentId: z.string().uuid().nullish(),
  })
  .refine((d) => d.endsAt > d.startsAt, {
    message: 'endsAt doit etre apres startsAt',
    path: ['endsAt'],
  });
const scheduleUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  location: z.string().max(160).nullish(),
  teacher: z.string().max(160).nullish(),
  startsAt: isoDate.optional(),
  endsAt: isoDate.optional(),
  program: z.string().max(160).nullish(),
  studentId: z.string().uuid().nullish(),
});

export async function getSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    const universityId = resolveScopeUniversityId(req, 'query');
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;
    if (from && Number.isNaN(from.getTime())) throw new BadRequestError('from invalide');
    if (to && Number.isNaN(to.getTime())) throw new BadRequestError('to invalide');
    const items = await svc.listSchedule(universityId, { from, to });
    respondOk(res, { items });
  } catch (e) {
    next(e);
  }
}

export async function postSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    const universityId = resolveScopeUniversityId(req, 'body');
    const data = scheduleCreateSchema.parse(req.body);
    const item = await svc.createSchedule(universityId, data);
    audit(req, 'create', 'ScheduleEntry', item.id);
    respondCreated(res, { item });
  } catch (e) {
    next(e);
  }
}

export async function patchSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    const universityId = await resolveOwnerUniversityId(
      req,
      (x) => prisma.scheduleEntry.findUnique({ where: { id: x }, select: { universityId: true } }),
      id,
    );
    const data = scheduleUpdateSchema.parse(req.body);
    const item = await svc.updateSchedule(id, universityId, data);
    audit(req, 'update', 'ScheduleEntry', id);
    respondOk(res, { item });
  } catch (e) {
    next(e);
  }
}

export async function deleteScheduleCtrl(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    const universityId = await resolveOwnerUniversityId(
      req,
      (x) => prisma.scheduleEntry.findUnique({ where: { id: x }, select: { universityId: true } }),
      id,
    );
    await svc.deleteSchedule(id, universityId);
    audit(req, 'delete', 'ScheduleEntry', id);
    respondNoContent(res);
  } catch (e) {
    next(e);
  }
}

// ===========================================================================
// Loans
// ===========================================================================

const loanCreateSchema = z.object({
  studentId: z.string().uuid(),
  bookTitle: z.string().min(1).max(300),
  bookAuthor: z.string().max(200).nullish(),
  isbn: z.string().max(40).nullish(),
  dueAt: isoDate,
  borrowedAt: isoDate.optional(),
  maxRenewals: z.number().int().min(0).max(20).optional(),
});
const loanUpdateSchema = z.object({
  returnedAt: isoDate.nullish(),
  dueAt: isoDate.optional(),
  renewedCount: z.number().int().min(0).max(100).optional(),
  bookTitle: z.string().min(1).max(300).optional(),
  bookAuthor: z.string().max(200).nullish(),
  isbn: z.string().max(40).nullish(),
  maxRenewals: z.number().int().min(0).max(20).optional(),
});

export async function getLoans(req: Request, res: Response, next: NextFunction) {
  try {
    const universityId = resolveScopeUniversityId(req, 'query');
    const studentId = req.query.studentId ? String(req.query.studentId) : undefined;
    const items = await svc.listLoans(universityId, studentId);
    respondOk(res, { items });
  } catch (e) {
    next(e);
  }
}

export async function postLoan(req: Request, res: Response, next: NextFunction) {
  try {
    const universityId = resolveScopeUniversityId(req, 'body');
    const data = loanCreateSchema.parse(req.body);
    const item = await svc.createLoan(universityId, data);
    audit(req, 'create', 'LibraryLoan', item.id);
    respondCreated(res, { item });
  } catch (e) {
    next(e);
  }
}

export async function patchLoan(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    const universityId = await resolveOwnerUniversityId(
      req,
      (x) => prisma.libraryLoan.findUnique({ where: { id: x }, select: { universityId: true } }),
      id,
    );
    const data = loanUpdateSchema.parse(req.body);
    const item = await svc.updateLoan(id, universityId, data);
    audit(req, 'update', 'LibraryLoan', id);
    respondOk(res, { item });
  } catch (e) {
    next(e);
  }
}

export async function deleteLoanCtrl(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    const universityId = await resolveOwnerUniversityId(
      req,
      (x) => prisma.libraryLoan.findUnique({ where: { id: x }, select: { universityId: true } }),
      id,
    );
    await svc.deleteLoan(id, universityId);
    audit(req, 'delete', 'LibraryLoan', id);
    respondNoContent(res);
  } catch (e) {
    next(e);
  }
}

// ===========================================================================
// Deals
// ===========================================================================

const dealCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().nullish(),
  partner: z.string().max(160).nullish(),
  category: z.string().max(80).nullish(),
  url: z.string().url().max(500).nullish(),
  code: z.string().max(80).nullish(),
  isActive: z.boolean().optional(),
  startsAt: isoDate.nullish(),
  expiresAt: isoDate.nullish(),
});
const dealUpdateSchema = dealCreateSchema.partial();

export async function getDeals(req: Request, res: Response, next: NextFunction) {
  try {
    const universityId = resolveScopeUniversityId(req, 'query');
    const items = await svc.listDeals(universityId);
    respondOk(res, { items });
  } catch (e) {
    next(e);
  }
}

export async function postDeal(req: Request, res: Response, next: NextFunction) {
  try {
    // Deal "global" (universityId=null) reserve au SUPER_ADMIN: ici un
    // admin/editeur ne cree QUE pour son tenant (universityId force).
    const universityId = resolveScopeUniversityId(req, 'body');
    const data = dealCreateSchema.parse(req.body);
    const item = await svc.createDeal(universityId, data);
    audit(req, 'create', 'Deal', item.id);
    respondCreated(res, { item });
  } catch (e) {
    next(e);
  }
}

export async function patchDeal(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    const universityId = await resolveOwnerUniversityId(
      req,
      (x) => prisma.deal.findUnique({ where: { id: x }, select: { universityId: true } }),
      id,
    );
    const data = dealUpdateSchema.parse(req.body);
    const item = await svc.updateDeal(id, universityId, data);
    audit(req, 'update', 'Deal', id);
    respondOk(res, { item });
  } catch (e) {
    next(e);
  }
}

export async function deleteDealCtrl(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    const universityId = await resolveOwnerUniversityId(
      req,
      (x) => prisma.deal.findUnique({ where: { id: x }, select: { universityId: true } }),
      id,
    );
    await svc.deleteDeal(id, universityId);
    audit(req, 'delete', 'Deal', id);
    respondNoContent(res);
  } catch (e) {
    next(e);
  }
}
