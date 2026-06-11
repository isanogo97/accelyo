/**
 * Routes /api/v1/me
 * ----------------------------------------------------------------
 * Endpoint d'introspection: "qui suis-je, quel role, quel tenant ?"
 *
 * Le dashboard l'appelle apres login pour:
 *   - Afficher l'email + role dans le header
 *   - Afficher le nom de l'universite si UNIVERSITY_ADMIN/STAFF
 *   - Adapter la navigation (SUPER_ADMIN voit "Universites", les autres non)
 */
import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { requireAuth } from '../../middleware/auth';
import { respondOk } from '../../utils/respond';
import { UnauthorizedError } from '../../utils/errors';

const router = Router();

router.get(
  '/',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.auth) throw new UnauthorizedError();
      const user = await prisma.user.findUnique({
        where: { id: req.auth.sub },
        select: {
          id: true,
          email: true,
          role: true,
          universityId: true,
          mfaEnabled: true,
          mustChangePassword: true,
          lastLoginAt: true,
          isActive: true,
          university: {
            select: { id: true, name: true, domain: true, isActive: true },
          },
        },
      });
      if (!user || !user.isActive) throw new UnauthorizedError();
      respondOk(res, user);
    } catch (e) {
      next(e);
    }
  },
);

export default router;
