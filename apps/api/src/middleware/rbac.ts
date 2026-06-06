/**
 * Controle d'acces base sur les roles (RBAC).
 * ----------------------------------------------------------------
 * Usage:
 *   router.post('/cards/:id/revoke',
 *     requireAuth, requireRole(Role.UNIVERSITY_ADMIN), handler);
 *
 * Le SUPER_ADMIN bypass automatiquement tous les controles de role.
 *
 * SI VOUS AJOUTEZ UN NOUVEAU ROLE: penser a:
 *   1. Mettre a jour packages/shared/src/enums.ts
 *   2. Mettre a jour le schema Prisma + migration
 *   3. Mettre a jour la matrice PERMISSIONS ci-dessous
 */

import type { RequestHandler } from 'express';
import { Role } from '@accelyo/shared';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

/**
 * Renvoie un middleware qui exige l'un des roles fournis.
 * SUPER_ADMIN est implicitement accepte partout.
 */
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) return next(new UnauthorizedError());
    if (req.auth.role === Role.SUPER_ADMIN) return next();
    if (!roles.includes(req.auth.role as Role)) {
      return next(new ForbiddenError('Role insuffisant'));
    }
    next();
  };
}

/**
 * Restreint l'acces a sa propre universite.
 * SUPER_ADMIN voit tout. Sinon, on verifie que l'universityId du
 * parametre/body correspond a celui du token.
 */
export function requireSameUniversity(
  paramName: string = 'universityId',
): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) return next(new UnauthorizedError());
    if (req.auth.role === Role.SUPER_ADMIN) return next();

    const requested =
      req.params[paramName] ??
      (req.body as { [k: string]: unknown })?.[paramName] ??
      req.query[paramName];

    if (
      typeof requested === 'string' &&
      requested !== req.auth.universityId
    ) {
      return next(new ForbiddenError('Universite hors perimetre'));
    }
    next();
  };
}
