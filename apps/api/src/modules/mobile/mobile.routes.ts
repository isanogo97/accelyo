/**
 * Endpoints consommes par l'application mobile etudiante.
 * ----------------------------------------------------------------
 * Le role STUDENT est emis lorsqu'un etudiant s'authentifie depuis
 * l'app mobile (par ex. via SSO universite ou magic link email).
 *
 * Un etudiant ne peut acceder QU'A SES PROPRES donnees - on filtre
 * systematiquement par req.auth.sub (= studentId pour ce role).
 *
 * NB: Pour Accelyo v1, l'authentification etudiant peut etre simplifiee
 * (magic link email + verification de l'email universitaire) plutot
 * qu'une integration LDAP universite par universite.
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { Platform, Role, AuditAction } from '@accelyo/shared';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { writeAudit } from '../../middleware/audit';
import { buildSignedCard } from '../cards/cards.service';
import { LIMITS } from '../../config/constants';
import { ConflictError, NotFoundError } from '../../utils/errors';
import { respondOk, respondCreated, respondNoContent } from '../../utils/respond';

const router = Router();
router.use(requireAuth, requireRole(Role.STUDENT));

/**
 * GET /mobile/card
 * Renvoie le payload signe de la carte pour cet etudiant.
 * L'app mobile le stocke dans le Keystore/Keychain.
 */
router.get('/card', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.auth!.sub;
    const card = await prisma.card.findFirst({
      where: { studentId },
      include: { student: true },
    });
    if (!card) throw new NotFoundError('Aucune carte pour cet etudiant');

    // L'empreinte device est passee en query (deja stockee cote client).
    const fingerprint = String(req.query.fingerprint ?? '');
    if (!fingerprint) throw new NotFoundError('fingerprint requis');

    const signed = await buildSignedCard(card.id, fingerprint);
    respondOk(res, {
      card: {
        id: card.id,
        cardUid: card.cardUid,
        status: card.status,
        issuedAt: card.issuedAt,
        expiresAt: card.expiresAt,
      },
      token: signed.token,
      payload: signed.payload,
    });
  } catch (e) {
    next(e);
  }
});

const registerDeviceSchema = z.object({
  deviceFingerprint: z.string().min(20).max(200),
  deviceName: z.string().max(100).optional(),
  platform: z.nativeEnum(Platform),
});

router.post(
  '/device/register',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = req.auth!.sub;
      const body = registerDeviceSchema.parse(req.body);

      const activeDevices = await prisma.device.count({
        where: { studentId, isActive: true },
      });
      if (activeDevices >= LIMITS.MAX_DEVICES_PER_STUDENT) {
        throw new ConflictError(
          `Maximum ${LIMITS.MAX_DEVICES_PER_STUDENT} appareils actifs par etudiant`,
        );
      }

      const device = await prisma.device.upsert({
        where: { deviceFingerprint: body.deviceFingerprint },
        create: {
          studentId,
          deviceFingerprint: body.deviceFingerprint,
          deviceName: body.deviceName ?? null,
          platform: body.platform,
          isActive: true,
        },
        update: {
          isActive: true,
          lastActiveAt: new Date(),
        },
      });
      writeAudit(req, {
        action: AuditAction.DEVICE_REGISTERED,
        resourceType: 'Device',
        resourceId: device.id,
      });
      respondCreated(res, device);
    } catch (e) {
      next(e);
    }
  },
);

router.delete(
  '/device/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = req.auth!.sub;
      const id = String(req.params.id);
      const device = await prisma.device.findUnique({ where: { id } });
      if (!device || device.studentId !== studentId) {
        throw new NotFoundError();
      }
      await prisma.device.update({
        where: { id },
        data: { isActive: false },
      });
      writeAudit(req, {
        action: AuditAction.DEVICE_REVOKED,
        resourceType: 'Device',
        resourceId: id,
      });
      respondNoContent(res);
    } catch (e) {
      next(e);
    }
  },
);

export default router;
