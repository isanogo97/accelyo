/**
 * Service de gestion des cartes etudiantes.
 * ----------------------------------------------------------------
 * Cycle de vie:
 *   - issue:      cree une carte ACTIVE (apres avoir ete verifie qu'aucune
 *                 carte active n'existe pour l'etudiant)
 *   - suspend:    bloque temporairement (l'utilisateur peut la reactiver)
 *   - revoke:     definitif - une nouvelle carte doit etre emise
 *   - reactivate: depuis SUSPENDED uniquement
 *
 * La carte numerique = JWT signe RS256 (CardPayload). La cle privee
 * RSA reste sur le serveur. Les lecteurs Elatec utilisent la cle
 * publique pour la verification offline.
 */

import { randomBytes } from 'crypto';
import { signCardPayload } from '@accelyo/crypto';
import { AuditAction, CardStatus, type CardPayload } from '@accelyo/shared';
import type { Request } from 'express';
import { prisma } from '../../config/database';
import { getRedis, KEY } from '../../config/redis';
import { getRsaKeys } from '../../config/keys';
import { CARD_DEFAULT_VALIDITY_DAYS, TTL } from '../../config/constants';
import {
  ConflictError,
  NotFoundError,
  BadRequestError,
} from '../../utils/errors';
import { writeAudit } from '../../middleware/audit';

/**
 * Verifie qu'un utilisateur a le droit d'operer sur cette carte.
 * SUPER_ADMIN: passe partout.
 * Sinon: la carte DOIT appartenir a un etudiant de la meme universite.
 *
 * IMPORTANT: appeler avant toute mutation (issue/revoke/suspend/reactivate)
 * pour eviter qu'un admin univ A revoque les cartes de l'univ B.
 */
async function assertCardAccess(
  cardId: string,
  authRole: string | undefined,
  authUniversityId: string | undefined,
): Promise<void> {
  if (authRole === 'SUPER_ADMIN') return;
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { student: { select: { universityId: true } } },
  });
  if (!card) throw new NotFoundError();
  if (card.student.universityId !== authUniversityId) {
    // 404 plutot que 403 - ne pas reveler l'existence de la ressource.
    throw new NotFoundError();
  }
}

interface IssueOpts {
  studentId: string;
  expiresAt?: Date;
  /** UID Mifare a reutiliser - utile en migration. Sinon genere aleatoirement. */
  mifareUid?: string;
}

export async function issueCard(req: Request, opts: IssueOpts) {
  const student = await prisma.student.findUnique({
    where: { id: opts.studentId },
    include: { card: true },
  });
  if (!student) throw new NotFoundError('Etudiant introuvable');
  if (student.card && student.card.status === CardStatus.ACTIVE) {
    throw new ConflictError('Une carte active existe deja pour cet etudiant');
  }

  const cardUid = opts.mifareUid ?? randomBytes(7).toString('hex').toUpperCase();
  const expiresAt =
    opts.expiresAt ??
    new Date(Date.now() + CARD_DEFAULT_VALIDITY_DAYS * 24 * 60 * 60 * 1000);

  const { publicKey } = getRsaKeys();

  // Si carte existait deja (revoquee/expiree), on la met a jour pour
  // garder l'historique de validations relie au meme etudiant.
  const card = student.card
    ? await prisma.card.update({
        where: { id: student.card.id },
        data: {
          cardUid,
          publicKey,
          status: CardStatus.ACTIVE,
          issuedAt: new Date(),
          expiresAt,
          revokedAt: null,
          revokedReason: null,
        },
      })
    : await prisma.card.create({
        data: {
          studentId: opts.studentId,
          cardUid,
          publicKey,
          status: CardStatus.ACTIVE,
          expiresAt,
        },
      });

  writeAudit(req, {
    action: AuditAction.CARD_ISSUED,
    resourceType: 'Card',
    resourceId: card.id,
    metadata: { studentId: opts.studentId, cardUid },
  });
  return card;
}

/**
 * Renvoie le payload signe (JWT RS256) qui sera embarque dans l'app mobile.
 * @param deviceFingerprint hash de l'empreinte device pour binding.
 */
export async function buildSignedCard(
  cardId: string,
  deviceFingerprint: string,
): Promise<{ token: string; payload: CardPayload }> {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { student: true },
  });
  if (!card) throw new NotFoundError('Carte introuvable');
  if (card.status !== CardStatus.ACTIVE) {
    throw new BadRequestError(`Carte ${card.status}`);
  }

  const payload: CardPayload = {
    sub: card.studentId,
    university_id: card.student.universityId,
    card_uid: card.cardUid,
    issued_at: Math.floor(card.issuedAt.getTime() / 1000),
    expires_at: Math.floor(card.expiresAt.getTime() / 1000),
    permissions: [], // a etendre selon les besoins futurs.
    fingerprint: deviceFingerprint,
  };
  const { privateKey } = getRsaKeys();
  const token = signCardPayload(payload, privateKey);
  return { token, payload };
}

/** Verifie l'acces tenant a une carte avant operation. Export pour les controllers. */
export async function checkCardAccess(
  cardId: string,
  authRole: string | undefined,
  authUniversityId: string | undefined,
): Promise<void> {
  return assertCardAccess(cardId, authRole, authUniversityId);
}

export async function revokeCard(req: Request, cardId: string, reason: string) {
  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card) throw new NotFoundError();
  if (card.status === CardStatus.REVOKED) {
    throw new ConflictError('Carte deja revoquee');
  }

  const updated = await prisma.card.update({
    where: { id: cardId },
    data: {
      status: CardStatus.REVOKED,
      revokedAt: new Date(),
      revokedReason: reason,
    },
  });

  // Marqueur Redis pour propagation IMMEDIATE aux lecteurs en ligne.
  await getRedis().setex(
    KEY.revokedCard(cardId),
    TTL.REVOKED_CARD_SECONDS,
    '1',
  );

  writeAudit(req, {
    action: AuditAction.CARD_REVOKED,
    resourceType: 'Card',
    resourceId: cardId,
    metadata: { reason },
  });
  return updated;
}

export async function suspendCard(req: Request, cardId: string, reason: string) {
  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card) throw new NotFoundError();
  if (card.status !== CardStatus.ACTIVE) {
    throw new BadRequestError('Seules les cartes actives peuvent etre suspendues');
  }
  const updated = await prisma.card.update({
    where: { id: cardId },
    data: { status: CardStatus.SUSPENDED },
  });
  // Suspendue == provisoirement en revocation pour les lecteurs.
  await getRedis().setex(
    KEY.revokedCard(cardId),
    TTL.REVOKED_CARD_SECONDS,
    '1',
  );
  writeAudit(req, {
    action: AuditAction.CARD_SUSPENDED,
    resourceType: 'Card',
    resourceId: cardId,
    metadata: { reason },
  });
  return updated;
}

export async function reactivateCard(req: Request, cardId: string) {
  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card) throw new NotFoundError();
  if (card.status !== CardStatus.SUSPENDED) {
    throw new BadRequestError('Seules les cartes suspendues peuvent etre reactivees');
  }
  const updated = await prisma.card.update({
    where: { id: cardId },
    data: { status: CardStatus.ACTIVE },
  });
  await getRedis().del(KEY.revokedCard(cardId));
  writeAudit(req, {
    action: AuditAction.CARD_REACTIVATED,
    resourceType: 'Card',
    resourceId: cardId,
  });
  return updated;
}

export async function getCardHistory(cardId: string, limit = 100) {
  return prisma.cardValidation.findMany({
    where: { cardId },
    orderBy: { validatedAt: 'desc' },
    take: limit,
  });
}
