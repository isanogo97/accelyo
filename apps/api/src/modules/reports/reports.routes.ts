/**
 * Routes /api/v1/reports/*
 * Reservees aux admins universite.
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { Role } from '@accelyo/shared';
import { prisma } from '../../config/database';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { respondOk } from '../../utils/respond';

const router = Router();
router.use(requireAuth, requireRole(Role.UNIVERSITY_ADMIN, Role.SUPER_ADMIN));

/**
 * Statistiques d'utilisation - tableau de bord principal.
 * NE PAS renvoyer plus de 1 an de donnees - performance + RGPD.
 */
router.get('/usage', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const universityId = req.auth?.universityId;
    const where = universityId ? { card: { student: { universityId } } } : {};
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [totalStudents, activeCards, validations] = await Promise.all([
      prisma.student.count({
        where: universityId ? { universityId } : {},
      }),
      prisma.card.count({
        where: {
          status: 'ACTIVE',
          ...(universityId ? { student: { universityId } } : {}),
        },
      }),
      prisma.cardValidation.count({
        where: {
          ...where,
          validatedAt: { gte: since },
        },
      }),
    ]);

    respondOk(res, {
      totalStudents,
      activeCards,
      validations30d: validations,
      adoptionRate: totalStudents > 0 ? activeCards / totalStudents : 0,
    });
  } catch (e) {
    next(e);
  }
});

/**
 * Journal d'audit - filtres + pagination.
 * Filtre automatiquement par universite si l'utilisateur n'est pas SUPER_ADMIN.
 */
router.get('/audit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(String(req.query.page ?? '1'), 10);
    const pageSize = Math.min(parseInt(String(req.query.pageSize ?? '50'), 10), 200);
    const universityId =
      req.auth?.role === Role.SUPER_ADMIN
        ? (req.query.universityId as string | undefined)
        : req.auth?.universityId;

    const where: Record<string, unknown> = {};
    if (universityId) where.universityId = universityId;
    if (req.query.action) where.action = String(req.query.action);

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    respondOk(res, {
      items,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (e) {
    next(e);
  }
});

export default router;
