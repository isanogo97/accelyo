/**
 * Service de validation NFC - cote lecteurs Elatec.
 * ----------------------------------------------------------------
 * Flux complet d'une validation:
 *   1. L'etudiant approche son telephone du lecteur.
 *   2. Le lecteur recoit l'UID Mifare emule via HCE.
 *   3. Le lecteur fait POST /api/v1/nfc/validate
 *   4. L'API verifie:
 *      - Signature HMAC du lecteur
 *      - Tolerance horloge +/- 30s (anti-replay #1)
 *      - Le nonce n'a pas deja ete vu (anti-replay #2)
 *      - La carte existe, est ACTIVE, n'est pas dans la blacklist Redis
 *      - L'expiration n'est pas depassee
 *   5. L'API persiste un CardValidation et repond GRANTED/DENIED.
 *
 * Performance critique - cible <200ms p99. Pas de query inutile.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { CardStatus, AuditAction } from '@accelyo/shared';
import type { ElatecValidationResponse } from '@accelyo/shared';
import type { Request } from 'express';
import { prisma } from '../../config/database';
import { getRedis, KEY } from '../../config/redis';
import { getEnv } from '../../config/env';
import { decrypt } from '@accelyo/crypto';
import { LIMITS, TTL } from '../../config/constants';
import { writeAudit } from '../../middleware/audit';
import { logger } from '../../utils/logger';

interface NfcInput {
  reader_id: string;
  reader_location: string;
  card_uid: string;
  timestamp: number;
  nonce: string;
  signature: string;
}

export async function validateNfc(
  req: Request,
  input: NfcInput,
): Promise<ElatecValidationResponse> {
  // 1. Verifie le lecteur (existe + actif + signature OK)
  const reader = await prisma.nfcReader.findUnique({
    where: { readerId: input.reader_id },
  });
  if (!reader || !reader.isActive) {
    return deny('reader_not_registered');
  }

  const env = getEnv();
  const apiKey = decrypt(reader.apiKeyEnc, env.ENCRYPTION_KEY);
  if (!verifySignature(input, apiKey)) {
    return deny('invalid_signature');
  }

  // 2. Tolerance horloge.
  const skew = Math.abs(Date.now() - input.timestamp);
  if (skew > LIMITS.NFC_TIMESTAMP_SKEW_MS) {
    return deny('timestamp_skew');
  }

  // 3. Anti-replay nonce.
  const redis = getRedis();
  const set = await redis.set(
    KEY.nfcNonce(input.nonce),
    '1',
    'EX',
    TTL.NFC_NONCE_SECONDS,
    'NX',
  );
  if (set !== 'OK') {
    return deny('nonce_replay');
  }

  // 4. Carte existante + active.
  const card = await prisma.card.findUnique({
    where: { cardUid: input.card_uid },
    include: { student: true },
  });
  if (!card) {
    await persistAttempt(input, null, false, 'card_not_found');
    return deny('card_not_found');
  }

  // 5. Blacklist Redis (revoquee/suspendue) - check tres rapide.
  const blacklisted = await redis.exists(KEY.revokedCard(card.id));
  if (blacklisted) {
    await persistAttempt(input, card.id, false, 'card_blacklisted');
    return deny('card_blacklisted');
  }

  if (card.status !== CardStatus.ACTIVE) {
    await persistAttempt(input, card.id, false, `status_${card.status}`);
    return deny(`status_${card.status}`.toLowerCase());
  }

  if (card.expiresAt < new Date()) {
    await persistAttempt(input, card.id, false, 'expired');
    return deny('expired');
  }

  // 6. Tout va bien - on persiste, on log audit, on update lastUsedAt.
  await persistAttempt(input, card.id, true, null);
  await prisma.card.update({
    where: { id: card.id },
    data: { lastUsedAt: new Date() },
  });
  // Mise a jour async du dernier vu du lecteur - non bloquant.
  prisma.nfcReader
    .update({
      where: { readerId: input.reader_id },
      data: { lastSeenAt: new Date() },
    })
    .catch((err: unknown) => logger.warn({ err }, 'reader lastSeenAt update failed'));

  writeAudit(req, {
    action: AuditAction.CARD_VALIDATED,
    resourceType: 'Card',
    resourceId: card.id,
    metadata: {
      readerId: input.reader_id,
      readerLocation: input.reader_location,
    },
  });

  return {
    granted: true,
    expires_at: Math.floor(card.expiresAt.getTime() / 1000),
    // student_name peut etre ajoute si la politique l'autorise
    // (exposer le nom sur l'ecran d'un lecteur public est sensible).
  };
}

async function persistAttempt(
  input: NfcInput,
  cardId: string | null,
  success: boolean,
  failureReason: string | null,
) {
  if (!cardId) return; // pas de FK -> pas de log persistant
  await prisma.cardValidation.create({
    data: {
      cardId,
      readerId: input.reader_id,
      readerLocation: input.reader_location,
      nonce: input.nonce,
      success,
      failureReason,
    },
  });
}

function verifySignature(input: NfcInput, apiKey: string): boolean {
  // Recompose le message signe (memes champs, meme ordre que cote lecteur).
  const msg = [
    input.reader_id,
    input.reader_location,
    input.card_uid,
    String(input.timestamp),
    input.nonce,
  ].join('|');
  const expected = createHmac('sha256', apiKey).update(msg).digest('hex');
  if (expected.length !== input.signature.length) return false;
  return timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(input.signature, 'hex'),
  );
}

function deny(reason: string): ElatecValidationResponse {
  return { granted: false, reason };
}
