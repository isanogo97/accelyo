/**
 * Routes /api/v1/universities/*
 * ----------------------------------------------------------------
 * Politique d'acces:
 *   - SUPER_ADMIN (Accelyo) : voit, cree, modifie TOUTES les universites.
 *   - UNIVERSITY_ADMIN/STAFF: voit UNIQUEMENT son universite via GET /:id
 *     (verifie req.auth.universityId === :id).
 *
 * Sous-ressources:
 *   - GET    /:id/stats   - stats agregees (nb etudiants, cartes, etc.)
 *   - POST   /:id/admins  - cree un compte UNIVERSITY_ADMIN pour cette univ
 *
 * ATTENTION: La creation d'un admin universitaire renvoie le mot de passe
 * initial UNE SEULE FOIS. En production il faut l'envoyer par email
 * et NE PAS l'afficher au super admin (eviter la connaissance partagee).
 */
import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { Role, AuditAction } from '@accelyo/shared';
import {
  createUniversitySchema,
  updateUniversitySchema,
} from '@accelyo/validators';
import { emailSchema } from '@accelyo/validators';
import { hashPassword } from '@accelyo/crypto';
import { prisma } from '../../config/database';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { writeAudit } from '../../middleware/audit';
import { respondOk, respondCreated, respondNoContent } from '../../utils/respond';
import { ConflictError, ForbiddenError, NotFoundError } from '../../utils/errors';

const router = Router();
router.use(requireAuth);

/** Liste de toutes les universites - SUPER_ADMIN uniquement. */
router.get('/', requireRole(Role.SUPER_ADMIN), async (_req, res, next) => {
  try {
    // On enrichit chaque universite avec ses stats (1 seule requete agregee).
    const items = await prisma.university.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { students: true, admins: true, readers: true } },
      },
    });
    respondOk(res, items);
  } catch (e) {
    next(e);
  }
});

router.post(
  '/',
  requireRole(Role.SUPER_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = createUniversitySchema.parse(req.body);
      const exists = await prisma.university.findUnique({
        where: { domain: body.domain },
      });
      if (exists) throw new ConflictError('Domaine deja utilise');
      // Numero de site: prefixe code postal (2 chiffres) + compteur global
      // (sequence sur l'ensemble des etablissements).
      let siteCode: string | undefined;
      if (body.postalCode) {
        const prefix = body.postalCode.slice(0, 2);
        const total = await prisma.university.count();
        siteCode = prefix + String(total + 1).padStart(2, '0');
      }
      const created = await prisma.university.create({
        data: { ...body, ...(siteCode ? { siteCode } : {}) },
      });
      writeAudit(req, {
        action: AuditAction.UNIVERSITY_CREATED,
        resourceType: 'University',
        resourceId: created.id,
      });
      respondCreated(res, created);
    } catch (e) {
      next(e);
    }
  },
);

/**
 * Detail d'une universite.
 * UNIVERSITY_ADMIN/STAFF peut voir SA propre universite uniquement.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const id = String(req.params.id);
    if (
      req.auth!.role !== Role.SUPER_ADMIN &&
      req.auth!.universityId !== id
    ) {
      throw new ForbiddenError('Universite hors perimetre');
    }
    const u = await prisma.university.findUnique({
      where: { id },
      include: {
        _count: { select: { students: true, admins: true, readers: true } },
        contacts: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!u) throw new NotFoundError();
    respondOk(res, u);
  } catch (e) {
    next(e);
  }
});

/**
 * Stats detaillees (nb cartes actives, validations 30j, etc.).
 * Accessible au SUPER_ADMIN et a l'admin de l'universite concernee.
 */
router.get('/:id/stats', async (req, res, next) => {
  try {
    const id = String(req.params.id);
    if (
      req.auth!.role !== Role.SUPER_ADMIN &&
      req.auth!.universityId !== id
    ) {
      throw new ForbiddenError();
    }
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [students, activeCards, validations30d, readers] = await Promise.all([
      prisma.student.count({ where: { universityId: id } }),
      prisma.card.count({
        where: { status: 'ACTIVE', student: { universityId: id } },
      }),
      prisma.cardValidation.count({
        where: {
          card: { student: { universityId: id } },
          validatedAt: { gte: since },
        },
      }),
      prisma.nfcReader.count({ where: { universityId: id, isActive: true } }),
    ]);

    respondOk(res, {
      students,
      activeCards,
      validations30d,
      readers,
      adoptionRate: students > 0 ? activeCards / students : 0,
    });
  } catch (e) {
    next(e);
  }
});

router.put(
  '/:id',
  requireRole(Role.SUPER_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      const body = updateUniversitySchema.parse(req.body);
      const updated = await prisma.university.update({
        where: { id },
        data: body,
      });
      writeAudit(req, {
        action: AuditAction.UNIVERSITY_UPDATED,
        resourceType: 'University',
        resourceId: id,
      });
      respondOk(res, updated);
    } catch (e) {
      next(e);
    }
  },
);

/** Desactivation (soft delete) - on ne supprime jamais une universite. */
router.delete('/:id', requireRole(Role.SUPER_ADMIN), async (req, res, next) => {
  try {
    const id = String(req.params.id);
    await prisma.university.update({
      where: { id },
      data: { isActive: false },
    });
    respondNoContent(res);
  } catch (e) {
    next(e);
  }
});

/**
 * Cree un compte UNIVERSITY_ADMIN ou UNIVERSITY_STAFF pour cette universite.
 *
 * Body: { email, role }
 *   - role doit etre UNIVERSITY_ADMIN ou UNIVERSITY_STAFF.
 *   - email doit etre dans le domaine de l'universite (ex: @univ-paris1.fr).
 *
 * Reponse:
 *   - user: le user cree (sans passwordHash)
 *   - temporaryPassword: mot de passe a usage unique - A FAIRE CHANGER au premier login
 *
 * ATTENTION: Le mot de passe est EXPOSE UNE SEULE FOIS dans la reponse.
 * En production, l'envoyer par email et JAMAIS l'afficher dans le dashboard.
 */
const createAdminSchema = z.object({
  email: emailSchema,
  role: z.enum([Role.UNIVERSITY_ADMIN, Role.UNIVERSITY_STAFF]),
});

router.post(
  '/:id/admins',
  requireRole(Role.SUPER_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const universityId = String(req.params.id);
      const body = createAdminSchema.parse(req.body);

      const univ = await prisma.university.findUnique({
        where: { id: universityId },
      });
      if (!univ) throw new NotFoundError('Universite introuvable');

      // Verifie l'unicite globale de l'email - un utilisateur peut etre admin
      // d'une seule universite (Sorbonne != Sciences Po).
      const existing = await prisma.user.findUnique({
        where: { email: body.email },
      });
      if (existing) throw new ConflictError('Email deja utilise');

      // Mot de passe temporaire fort (16 bytes hex + 2 caracteres speciaux).
      // L'utilisateur DEVRA le changer au premier login (TODO: forcer le reset).
      const temporaryPassword = randomBytes(8).toString('hex') + 'A!9';
      const passwordHash = await hashPassword(temporaryPassword);

      const user = await prisma.user.create({
        data: {
          email: body.email,
          passwordHash,
          role: body.role,
          universityId,
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          role: true,
          universityId: true,
          isActive: true,
          createdAt: true,
        },
      });

      writeAudit(req, {
        action: AuditAction.UNIVERSITY_UPDATED,
        resourceType: 'User',
        resourceId: user.id,
        metadata: { universityId, role: body.role },
      });

      respondCreated(res, { user, temporaryPassword });
    } catch (e) {
      next(e);
    }
  },
);

/** Liste des admins d'une universite. */
router.get('/:id/admins', async (req, res, next) => {
  try {
    const id = String(req.params.id);
    if (
      req.auth!.role !== Role.SUPER_ADMIN &&
      req.auth!.universityId !== id
    ) {
      throw new ForbiddenError();
    }
    const items = await prisma.user.findMany({
      where: { universityId: id, isActive: true },
      select: {
        id: true,
        email: true,
        role: true,
        mfaEnabled: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    respondOk(res, items);
  } catch (e) {
    next(e);
  }
});

// -----------------------------------------------------------------
// Personnes a contacter de l'etablissement (SUPER_ADMIN).
// -----------------------------------------------------------------
const establishmentContactSchema = z.object({
  firstName: z.string().min(1).max(120),
  lastName: z.string().min(1).max(120),
  email: emailSchema.optional(),
  phone: z.string().max(40).optional(),
  jobTitle: z.string().max(120).optional(),
});

router.post(
  '/:id/contacts',
  requireRole(Role.SUPER_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const universityId = String(req.params.id);
      const body = establishmentContactSchema.parse(req.body);
      const contact = await prisma.establishmentContact.create({
        data: { universityId, ...body },
      });
      respondCreated(res, contact);
    } catch (e) {
      next(e);
    }
  },
);

router.delete(
  '/:id/contacts/:contactId',
  requireRole(Role.SUPER_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await prisma.establishmentContact.delete({
        where: { id: String(req.params.contactId) },
      });
      respondNoContent(res);
    } catch (e) {
      next(e);
    }
  },
);

export default router;
