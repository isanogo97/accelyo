/**
 * Helper pour ecrire dans le journal d'audit.
 * ----------------------------------------------------------------
 * IMPORTANT: appeler writeAudit() apres CHAQUE action admin
 * (creation, modification, suppression, revocation, etc.).
 *
 * NE PAS attendre l'ecriture audit pour repondre au client - on lance
 * l'ecriture en "fire-and-forget" mais on logge si elle echoue.
 *
 * Conservation: 1 an minimum (obligation legale RGPD).
 */

import type { Request } from 'express';
import type { AuditAction } from '@accelyo/shared';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

interface AuditContext {
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

export function writeAudit(req: Request, ctx: AuditContext): void {
  const ipAddress = req.ip ?? null;
  const userAgent = req.headers['user-agent'] ?? null;

  prisma.auditLog
    .create({
      data: {
        actorId: req.auth?.sub ?? null,
        actorRole: req.auth?.role ?? null,
        universityId: req.auth?.universityId ?? null,
        action: ctx.action,
        resourceType: ctx.resourceType,
        resourceId: ctx.resourceId ?? null,
        metadata: (ctx.metadata as object) ?? null,
        ipAddress,
        userAgent: userAgent as string | null,
      },
    })
    .catch((err) => {
      // Si l'audit echoue on logge - JAMAIS de fail silencieux pour ce systeme.
      logger.error({ err, ctx }, 'audit log write failed');
    });
}
