/**
 * Tokens JWT pour l'API (access + refresh).
 * ----------------------------------------------------------------
 * Strategie:
 *   - accessToken: 15 minutes max (HS256, signe avec JWT_SECRET).
 *   - refreshToken: 7 jours, ROTATIF (a chaque refresh, on revoque l'ancien).
 *   - Les refresh tokens sont stockes/revocables en Redis (voir API).
 *   - On peut blacklister un access token via Redis si compromission.
 *
 * Pourquoi JWT et pas une session classique ?
 *   - Stateless: l'API peut scaler horizontalement sans sticky sessions.
 *   - On utilise tout de meme Redis pour la blacklist - hybride.
 *
 * ATTENTION:
 *   - JWT_SECRET et JWT_REFRESH_SECRET doivent etre DIFFERENTS.
 *   - 64 caracteres hex minimum (256 bits d'entropie).
 *   - Ne JAMAIS mettre d'info sensible dans le payload (c'est en base64,
 *     lisible par tout le monde - juste signe, pas chiffre).
 */

import jwt, { type SignOptions } from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import type { Role } from '@accelyo/shared';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';

export interface AccessTokenPayload {
  /** UUID utilisateur. */
  sub: string;
  /** Role pour le RBAC. */
  role: Role;
  /** UUID universite si role != SUPER_ADMIN. */
  universityId?: string;
  /** Si MFA active, indique si le token est "post-MFA". */
  mfaVerified: boolean;
}

export interface RefreshTokenPayload {
  sub: string;
  /** Identifiant unique du refresh token (jti) - utilise pour la blacklist. */
  jti: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenJti: string;
}

/**
 * Cree une paire access + refresh token.
 * Le jti du refresh est retourne pour permettre son stockage cote API
 * dans Redis (whitelist + revocation).
 */
export function issueTokenPair(
  userId: string,
  role: Role,
  universityId: string | undefined,
  mfaVerified: boolean,
  accessSecret: string,
  refreshSecret: string,
): TokenPair {
  const accessPayload: AccessTokenPayload = {
    sub: userId,
    role,
    universityId,
    mfaVerified,
  };
  const accessOpts: SignOptions = { expiresIn: ACCESS_TOKEN_TTL };
  const accessToken = jwt.sign(accessPayload, accessSecret, accessOpts);

  const jti = randomBytes(16).toString('hex');
  const refreshPayload: RefreshTokenPayload = { sub: userId, jti };
  const refreshOpts: SignOptions = { expiresIn: REFRESH_TOKEN_TTL };
  const refreshToken = jwt.sign(refreshPayload, refreshSecret, refreshOpts);

  return { accessToken, refreshToken, refreshTokenJti: jti };
}

/** Decode et verifie un access token. Lance une erreur si invalide/expire. */
export function verifyAccessToken(
  token: string,
  secret: string,
): AccessTokenPayload {
  return jwt.verify(token, secret) as AccessTokenPayload;
}

export function verifyRefreshToken(
  token: string,
  secret: string,
): RefreshTokenPayload {
  return jwt.verify(token, secret) as RefreshTokenPayload;
}
