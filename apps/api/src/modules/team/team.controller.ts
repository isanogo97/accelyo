/**
 * Controleur du module Equipe (gestion staff & editeurs par l'admin d'etab).
 * ----------------------------------------------------------------
 * REGLES DE PERIMETRE (strictes):
 *   - Acces: UNIVERSITY_ADMIN (et SUPER_ADMIN qui bypass le requireRole).
 *   - non-super: universityId FORCE a req.auth.universityId.
 *   - SUPER_ADMIN: universityId requis (query GET / body POST), 400 sinon.
 *   - On ne peut AGIR que sur des users du MEME tenant ET de role
 *     UNIVERSITY_STAFF ou CONTENT_EDITOR. Jamais sur un autre admin, jamais
 *     cross-tenant (assertManageableTarget verrouille les deux).
 */

import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Role, AuditAction } from '@accelyo/shared';
import { emailSchema } from '@accelyo/validators';
import { prisma } from '../../config/database';
import { writeAudit } from '../../middleware/audit';
import { respondOk, respondCreated } from '../../utils/respond';
import { BadRequestError, ConflictError, NotFoundError } from '../../utils/errors';
import { emailTempPassword, newTemporaryPassword } from '../../services/accountMailer';

/** Roles que l'admin d'etablissement peut gerer. */
const MANAGEABLE_ROLES: Role[] = [Role.UNIVERSITY_STAFF, Role.CONTENT_EDITOR];

/** universityId effectif pour lecture/creation. */
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
  if (!auth.universityId) throw new BadRequestError('Compte sans universite');
  return auth.universityId;
}

/**
 * Charge un user cible et verifie qu'il est gerable par le caller:
 *   - meme tenant (sauf SUPER_ADMIN qui peut viser n'importe quel tenant),
 *   - role STAFF ou EDITEUR uniquement.
 * 404 sinon (on ne distingue pas "inexistant" de "hors perimetre").
 */
async function assertManageableTarget(req: Request, userId: string) {
  const auth = req.auth!;
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new NotFoundError('Utilisateur introuvable');
  if (!MANAGEABLE_ROLES.includes(target.role as Role)) {
    throw new NotFoundError('Utilisateur introuvable');
  }
  if (auth.role !== Role.SUPER_ADMIN && target.universityId !== auth.universityId) {
    throw new NotFoundError('Utilisateur introuvable');
  }
  return target;
}

const createSchema = z.object({
  email: emailSchema,
  role: z.enum([Role.CONTENT_EDITOR, Role.UNIVERSITY_STAFF]),
});

// GET /team
export async function listTeam(req: Request, res: Response, next: NextFunction) {
  try {
    const universityId = resolveScopeUniversityId(req, 'query');
    const users = await prisma.user.findMany({
      where: { universityId, role: { in: MANAGEABLE_ROLES } },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        mustChangePassword: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    respondOk(res, { users });
  } catch (e) {
    next(e);
  }
}

// POST /team
export async function createMember(req: Request, res: Response, next: NextFunction) {
  try {
    const universityId = resolveScopeUniversityId(req, 'body');
    const body = createSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) throw new ConflictError('Email deja utilise');

    const { temporaryPassword, passwordHash } = await newTemporaryPassword();
    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        role: body.role,
        universityId,
        isActive: true,
        mustChangePassword: true,
      },
      select: { id: true, email: true, role: true },
    });

    writeAudit(req, {
      action: AuditAction.UNIVERSITY_UPDATED,
      resourceType: 'User',
      resourceId: user.id,
      metadata: { module: 'team', op: 'create', role: body.role, universityId },
    });

    const emailed = await emailTempPassword(body.email, temporaryPassword);
    respondCreated(
      res,
      emailed ? { user, emailed } : { user, emailed, temporaryPassword },
    );
  } catch (e) {
    next(e);
  }
}

// POST /team/:userId/block
export async function blockMember(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = String(req.params.userId);
    await assertManageableTarget(req, userId);
    await prisma.user.update({ where: { id: userId }, data: { isActive: false } });
    writeAudit(req, {
      action: AuditAction.UNIVERSITY_UPDATED,
      resourceType: 'User',
      resourceId: userId,
      metadata: { module: 'team', op: 'block' },
    });
    respondOk(res, { ok: true });
  } catch (e) {
    next(e);
  }
}

// POST /team/:userId/unblock
export async function unblockMember(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = String(req.params.userId);
    await assertManageableTarget(req, userId);
    await prisma.user.update({ where: { id: userId }, data: { isActive: true } });
    writeAudit(req, {
      action: AuditAction.UNIVERSITY_UPDATED,
      resourceType: 'User',
      resourceId: userId,
      metadata: { module: 'team', op: 'unblock' },
    });
    respondOk(res, { ok: true });
  } catch (e) {
    next(e);
  }
}

// POST /team/:userId/reset-password
export async function resetMemberPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = String(req.params.userId);
    const target = await assertManageableTarget(req, userId);
    const { temporaryPassword, passwordHash } = await newTemporaryPassword();
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: true, failedAttempts: 0, lockedUntil: null },
    });
    writeAudit(req, {
      action: AuditAction.USER_PASSWORD_RESET,
      resourceType: 'User',
      resourceId: userId,
      metadata: { module: 'team' },
    });
    const emailed = await emailTempPassword(target.email, temporaryPassword);
    respondOk(res, emailed ? { emailed } : { emailed, temporaryPassword });
  } catch (e) {
    next(e);
  }
}

// DELETE /team/:userId  (desactivation, on ne supprime pas)
export async function deleteMember(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = String(req.params.userId);
    await assertManageableTarget(req, userId);
    await prisma.user.update({ where: { id: userId }, data: { isActive: false } });
    writeAudit(req, {
      action: AuditAction.UNIVERSITY_UPDATED,
      resourceType: 'User',
      resourceId: userId,
      metadata: { module: 'team', op: 'delete', deactivated: true },
    });
    respondOk(res, { ok: true });
  } catch (e) {
    next(e);
  }
}
