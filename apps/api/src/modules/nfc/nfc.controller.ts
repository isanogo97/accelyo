/**
 * Controllers HTTP pour /api/v1/nfc/*
 */
import type { Request, Response, NextFunction } from 'express';
import {
  validateNfcSchema,
  registerReaderSchema,
} from '@accelyo/validators';
import { validateNfc } from './nfc.service';
import { prisma } from '../../config/database';
import { encrypt } from '@accelyo/crypto';
import { getEnv } from '../../config/env';
import { randomBytes } from 'crypto';
import { respondCreated, respondOk } from '../../utils/respond';
import { writeAudit } from '../../middleware/audit';
import { AuditAction } from '@accelyo/shared';
import { ForbiddenError } from '../../utils/errors';

export async function postValidate(req: Request, res: Response, next: NextFunction) {
  try {
    const body = validateNfcSchema.parse(req.body);
    const result = await validateNfc(req, body);
    // ATTENTION: on renvoie 200 meme en cas de "denied" - le statut HTTP
    // ne doit pas reveler la raison du refus a un attaquant externe.
    respondOk(res, result);
  } catch (e) {
    next(e);
  }
}

/**
 * Enregistre un nouveau lecteur. Renvoie une cle d'API que le lecteur
 * doit stocker - elle ne peut etre re-affichee plus tard (chiffree en BDD).
 */
export async function postRegisterReader(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const body = registerReaderSchema.parse(req.body);
    const universityId = req.auth?.universityId;
    if (!universityId && req.auth?.role !== 'SUPER_ADMIN') {
      throw new ForbiddenError();
    }

    const apiKey = randomBytes(32).toString('hex');
    const env = getEnv();
    const reader = await prisma.nfcReader.create({
      data: {
        universityId: universityId ?? String((req.body as { universityId?: string })?.universityId),
        readerId: body.reader_id,
        label: body.label,
        location: body.location,
        apiKeyEnc: encrypt(apiKey, env.ENCRYPTION_KEY),
        isActive: true,
      },
    });

    writeAudit(req, {
      action: AuditAction.READER_REGISTERED,
      resourceType: 'NfcReader',
      resourceId: reader.id,
    });

    // ATTENTION: c'est la SEULE fois ou la cle est exposee en clair.
    respondCreated(res, { reader, apiKey });
  } catch (e) {
    next(e);
  }
}

export async function getReaders(req: Request, res: Response, next: NextFunction) {
  try {
    const where = req.auth?.role === 'SUPER_ADMIN'
      ? {}
      : { universityId: req.auth?.universityId };
    const items = await prisma.nfcReader.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    respondOk(res, items);
  } catch (e) {
    next(e);
  }
}
