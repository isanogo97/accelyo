/**
 * Authentification etudiant (app mobile).
 * ----------------------------------------------------------------
 * L'etudiant n'est PAS un User. Son acces vit sur le model Student
 * et se coupe immediatement si l'admin le desactive (isActive=false).
 *
 * Conçu "pluggable": ce mode mot-de-passe marche partout. Un mode SSO
 * (ENT: CAS/OIDC) pourra se brancher par-dessus sans tout refaire.
 */
import { randomBytes } from 'crypto';
import type { Request } from 'express';
import jwt from 'jsonwebtoken';
import {
  hashPassword,
  verifyPassword,
  decrypt,
  hashSearchable,
} from '@accelyo/crypto';
import { prisma } from '../../config/database';
import { getEnv } from '../../config/env';
import { sendEmail } from '../../services/emailService';
import { issueCard } from '../cards/cards.service';
import { logger } from '../../utils/logger';
import {
  UnauthorizedError,
  BadRequestError,
  NotFoundError,
} from '../../utils/errors';

const ACTIVATION_TTL_DAYS = 14;
const TOKEN_TTL = '30d';

export function issueStudentToken(studentId: string): string {
  const env = getEnv();
  return jwt.sign({ typ: 'student' }, env.JWT_SECRET, {
    subject: studentId,
    expiresIn: TOKEN_TTL,
  });
}

export function verifyStudentToken(token: string): string {
  const env = getEnv();
  let payload: unknown;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw new UnauthorizedError('Token invalide ou expire');
  }
  const p = payload as { sub?: string; typ?: string };
  if (p.typ !== 'student' || typeof p.sub !== 'string') {
    throw new UnauthorizedError('Token invalide');
  }
  return p.sub;
}

/** Genere un token d'activation et envoie l'e-mail (best-effort). */
export async function issueActivation(
  studentId: string,
  plaintextEmail: string,
): Promise<void> {
  const token = randomBytes(32).toString('hex');
  const expires = new Date(
    Date.now() + ACTIVATION_TTL_DAYS * 24 * 3600 * 1000,
  );
  await prisma.student.update({
    where: { id: studentId },
    data: { activationToken: token, activationTokenExpiresAt: expires },
  });

  const env = getEnv();
  const base = env.DASHBOARD_URL.replace(/\/$/, '');
  const link = `${base}/carte?token=${token}`;
  try {
    await sendEmail({
      to: plaintextEmail,
      subject: 'Activez votre carte etudiante Accelyo',
      text:
        'Bonjour,\n\n' +
        "Activez votre carte et accedez a l'application Accelyo :\n" +
        `${link}\n\n` +
        `Ce lien est valable ${ACTIVATION_TTL_DAYS} jours.\n`,
    });
  } catch (e) {
    logger.warn(
      { err: (e as Error).message, studentId },
      'activation email failed',
    );
  }
}

export async function activate(
  req: Request,
  token: string,
  password: string,
): Promise<{ token: string }> {
  const student = await prisma.student.findUnique({
    where: { activationToken: token },
  });
  if (
    !student ||
    !student.activationTokenExpiresAt ||
    student.activationTokenExpiresAt < new Date()
  ) {
    throw new BadRequestError("Lien d'activation invalide ou expire");
  }
  if (!student.isActive) throw new UnauthorizedError('Compte desactive');

  const passwordHash = await hashPassword(password);
  await prisma.student.update({
    where: { id: student.id },
    data: {
      passwordHash,
      activatedAt: new Date(),
      activationToken: null,
      activationTokenExpiresAt: null,
    },
  });

  // Emission automatique de la carte a l'activation (best-effort:
  // si une carte active existe deja, issueCard leve un conflit qu'on ignore).
  try {
    await issueCard(req, { studentId: student.id });
  } catch {
    // carte deja active - rien a faire.
  }

  // E-mail de confirmation avec le lien d'acces (best-effort).
  try {
    const env2 = getEnv();
    const base = env2.DASHBOARD_URL.replace(/\/$/, '');
    const email = decrypt(student.emailEnc, env2.ENCRYPTION_KEY);
    await sendEmail({
      to: email,
      subject: 'Votre carte etudiante Accelyo est activee',
      text:
        'Bonjour,\n\n' +
        'Votre carte etudiante est bien activee.\n' +
        'Accedez-y a tout moment ici : ' + base + '/carte\n' +
        '(connectez-vous avec votre e-mail et le mot de passe que vous venez de definir).\n\n' +
        "L'application mobile (Apple Wallet, NFC) arrive bientot.\n",
    });
  } catch {
    // envoi best-effort.
  }

  return { token: issueStudentToken(student.id) };
}

export async function login(
  email: string,
  password: string,
): Promise<{ token: string }> {
  const env = getEnv();
  const emailHash = hashSearchable(email, env.ENCRYPTION_KEY);
  const student = await prisma.student.findFirst({ where: { emailHash } });
  const fail = new UnauthorizedError('Identifiants invalides');
  if (!student || !student.passwordHash || !student.isActive) throw fail;
  const ok = await verifyPassword(password, student.passwordHash);
  if (!ok) throw fail;
  return { token: issueStudentToken(student.id) };
}

export async function getMe(studentId: string) {
  const env = getEnv();
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { university: true, card: true },
  });
  if (!student) throw new NotFoundError('Etudiant introuvable');

  return {
    student: {
      id: student.id,
      firstName: decrypt(student.firstNameEnc, env.ENCRYPTION_KEY),
      lastName: decrypt(student.lastNameEnc, env.ENCRYPTION_KEY),
      studentNumber: decrypt(student.studentNumberEnc, env.ENCRYPTION_KEY),
      email: decrypt(student.emailEnc, env.ENCRYPTION_KEY),
      enrollmentYear: student.enrollmentYear,
      program: student.program,
    },
    card: student.card
      ? {
          status: student.card.status,
          cardUid: student.card.cardUid,
          expiresAt: student.card.expiresAt,
        }
      : null,
    establishment: {
      name: student.university.name,
      sector: student.university.sector,
      brandColor: student.university.brandColor,
      logoUrl: student.university.logoUrl,
    },
    marketingConsent: student.marketingConsent,
  };
}

export async function setConsent(
  studentId: string,
  consent: boolean,
): Promise<void> {
  await prisma.student.update({
    where: { id: studentId },
    data: { marketingConsent: consent },
  });
}
