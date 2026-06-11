/**
 * Logique metier de l'authentification.
 * ----------------------------------------------------------------
 * Couvre login, refresh, logout, MFA setup, MFA verify, changement
 * de mot de passe.
 *
 * REGLES IMPORTANTES:
 *   - Les reponses d'erreur de login DOIVENT etre identiques entre
 *     "user not found" et "wrong password" (anti-enumeration).
 *   - Le compte se verrouille apres 5 echecs (LIMITS.MAX_LOGIN_FAILED_ATTEMPTS).
 *   - Tout login emet un evenement audit (succes ET echec).
 */

import { randomBytes } from 'crypto';
import {
  verifyPassword,
  hashPassword,
  issueTokenPair,
  verifyRefreshToken,
  generateMfaSecret,
  buildOtpAuthUrl,
  verifyMfaCode,
  encrypt,
  decrypt,
} from '@accelyo/crypto';
import type { Role } from '@accelyo/shared';
import { AuditAction } from '@accelyo/shared';
import { prisma } from '../../config/database';
import { getEnv } from '../../config/env';
import { getRedis, KEY } from '../../config/redis';
import { LIMITS, TTL } from '../../config/constants';
import { UnauthorizedError, BadRequestError } from '../../utils/errors';
import { writeAudit } from '../../middleware/audit';
import type { Request } from 'express';

export interface LoginResult {
  /** Renseigne uniquement si MFA NON requise. */
  tokens?: { accessToken: string; refreshToken: string };
  /** Renseigne uniquement si MFA requise. */
  mfaChallengeToken?: string;
  user: {
    id: string;
    email: string;
    role: string;
    universityId: string | null;
    mfaEnabled: boolean;
    mustChangePassword: boolean;
  };
}

export async function login(
  req: Request,
  email: string,
  password: string,
): Promise<LoginResult> {
  const user = await prisma.user.findUnique({ where: { email } });

  // Anti-enumeration: meme reponse generique en cas d'echec, qu'il s'agisse
  // d'un user inexistant ou d'un mauvais mot de passe.
  const genericFail = new UnauthorizedError('Identifiants invalides');

  if (!user || !user.isActive) {
    writeAudit(req, {
      action: AuditAction.USER_LOGIN_FAILED,
      resourceType: 'User',
      metadata: { email, reason: 'user_not_found_or_inactive' },
    });
    throw genericFail;
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new UnauthorizedError(
      `Compte verrouille jusqu'a ${user.lockedUntil.toISOString()}`,
    );
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    const failed = user.failedAttempts + 1;
    const shouldLock = failed >= LIMITS.MAX_LOGIN_FAILED_ATTEMPTS;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: failed,
        lockedUntil: shouldLock
          ? new Date(Date.now() + LIMITS.LOCKOUT_DURATION_MINUTES * 60 * 1000)
          : null,
      },
    });
    writeAudit(req, {
      action: AuditAction.USER_LOGIN_FAILED,
      resourceType: 'User',
      resourceId: user.id,
      metadata: { reason: 'bad_password', failedAttempts: failed },
    });
    throw genericFail;
  }

  // Reset compteur
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      lastLoginIp: req.ip ?? null,
    },
  });

  const userOut = {
    id: user.id,
    email: user.email,
    role: user.role,
    universityId: user.universityId,
    mfaEnabled: user.mfaEnabled,
    mustChangePassword: user.mustChangePassword,
  };

  // Si MFA active, on n'emet PAS encore d'access token.
  // On stocke un challenge token en Redis (TTL 5 min).
  if (user.mfaEnabled) {
    const challengeToken = randomBytes(32).toString('hex');
    const redis = getRedis();
    await redis.setex(
      KEY.mfaChallenge(challengeToken),
      TTL.MFA_CHALLENGE_SECONDS,
      user.id,
    );
    return { mfaChallengeToken: challengeToken, user: userOut };
  }

  // Pas de MFA - on emet directement les tokens.
  const tokens = await issueAndStoreTokens(
    user.id,
    user.role as Role,
    user.universityId ?? undefined,
    false,
  );

  writeAudit(req, {
    action: AuditAction.USER_LOGIN,
    resourceType: 'User',
    resourceId: user.id,
  });
  return { tokens, user: userOut };
}

export async function verifyMfaChallenge(
  req: Request,
  challengeToken: string,
  code: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const redis = getRedis();
  const userId = await redis.get(KEY.mfaChallenge(challengeToken));
  if (!userId) {
    throw new UnauthorizedError('Challenge MFA expire ou inconnu');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.mfaEnabled || !user.mfaSecret) {
    throw new UnauthorizedError('MFA non configuree');
  }

  const env = getEnv();
  const secret = decrypt(user.mfaSecret, env.ENCRYPTION_KEY);
  if (!verifyMfaCode(code, secret)) {
    throw new UnauthorizedError('Code MFA invalide');
  }

  await redis.del(KEY.mfaChallenge(challengeToken));

  writeAudit(req, {
    action: AuditAction.USER_LOGIN,
    resourceType: 'User',
    resourceId: user.id,
    metadata: { mfa: true },
  });
  return issueAndStoreTokens(
    user.id,
    user.role as Role,
    user.universityId ?? undefined,
    true,
  );
}

export async function refreshTokens(
  oldRefreshToken: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const env = getEnv();
  let payload;
  try {
    payload = verifyRefreshToken(oldRefreshToken, env.JWT_REFRESH_SECRET);
  } catch {
    throw new UnauthorizedError('Refresh token invalide');
  }

  const redis = getRedis();
  // Le jti DOIT etre dans la whitelist Redis (sinon revoque ou jamais emis).
  const stored = await redis.get(KEY.refreshToken(payload.jti));
  if (!stored || stored !== payload.sub) {
    throw new UnauthorizedError('Refresh token revoque');
  }

  // Rotation: on revoque l'ancien jti immediatement.
  await redis.del(KEY.refreshToken(payload.jti));

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) {
    throw new UnauthorizedError();
  }

  return issueAndStoreTokens(
    user.id,
    user.role as Role,
    user.universityId ?? undefined,
    user.mfaEnabled, // si MFA active sur le compte, on conserve le statut.
  );
}

export async function logout(refreshToken: string): Promise<void> {
  const env = getEnv();
  try {
    const payload = verifyRefreshToken(refreshToken, env.JWT_REFRESH_SECRET);
    await getRedis().del(KEY.refreshToken(payload.jti));
  } catch {
    // On ignore les erreurs - logout est idempotent.
  }
}

export async function setupMfa(
  userId: string,
): Promise<{ secret: string; otpAuthUrl: string }> {
  const env = getEnv();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new BadRequestError('Utilisateur introuvable');

  const secret = generateMfaSecret();
  const otpAuthUrl = buildOtpAuthUrl(user.email, secret);

  // On chiffre AVANT de stocker.
  await prisma.user.update({
    where: { id: userId },
    data: {
      mfaSecret: encrypt(secret, env.ENCRYPTION_KEY),
      // mfaEnabled passe a true seulement apres confirmation par /mfa/confirm.
    },
  });
  return { secret, otpAuthUrl };
}

export async function confirmMfa(
  req: Request,
  userId: string,
  code: string,
): Promise<{ backupCodes: string[] }> {
  const env = getEnv();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.mfaSecret) {
    throw new BadRequestError('MFA non initialisee');
  }
  const secret = decrypt(user.mfaSecret, env.ENCRYPTION_KEY);
  if (!verifyMfaCode(code, secret)) {
    throw new BadRequestError('Code MFA invalide');
  }

  // 8 codes de secours - on les stocke chiffres.
  const backupCodes = Array.from({ length: 8 }, () =>
    randomBytes(5).toString('hex'),
  );
  const encryptedCodes = backupCodes.map((c) => encrypt(c, env.ENCRYPTION_KEY));

  await prisma.user.update({
    where: { id: userId },
    data: { mfaEnabled: true, backupCodes: encryptedCodes },
  });
  writeAudit(req, {
    action: AuditAction.USER_MFA_ENABLED,
    resourceType: 'User',
    resourceId: userId,
  });
  return { backupCodes };
}

/**
 * Changement de mot de passe par l'utilisateur lui-meme (deja authentifie).
 * Exige le mot de passe actuel (re-authentification) pour empecher qu'une
 * session volee ne change le mot de passe sans le connaitre.
 */
export async function changePassword(
  req: Request,
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new UnauthorizedError();

  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) {
    writeAudit(req, {
      action: AuditAction.USER_LOGIN_FAILED,
      resourceType: 'User',
      resourceId: user.id,
      metadata: { reason: 'change_password_bad_current' },
    });
    throw new UnauthorizedError('Mot de passe actuel incorrect');
  }

  const newHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash, mustChangePassword: false },
  });

  writeAudit(req, {
    action: AuditAction.USER_PASSWORD_RESET,
    resourceType: 'User',
    resourceId: user.id,
    metadata: { self: true },
  });
}

async function issueAndStoreTokens(
  userId: string,
  role: Role,
  universityId: string | undefined,
  mfaVerified: boolean,
): Promise<{ accessToken: string; refreshToken: string }> {
  const env = getEnv();
  const pair = issueTokenPair(
    userId,
    role,
    universityId,
    mfaVerified,
    env.JWT_SECRET,
    env.JWT_REFRESH_SECRET,
  );
  // Whitelist du refresh token en Redis avec TTL identique au token.
  await getRedis().setex(
    KEY.refreshToken(pair.refreshTokenJti),
    TTL.REFRESH_TOKEN_SECONDS,
    userId,
  );
  return { accessToken: pair.accessToken, refreshToken: pair.refreshToken };
}
