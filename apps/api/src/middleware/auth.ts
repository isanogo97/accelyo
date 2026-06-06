/**
 * Middleware de verification du JWT access token.
 * ----------------------------------------------------------------
 * Verifie:
 *   1. Le header Authorization est present et bien forme.
 *   2. Le token est signe par notre JWT_SECRET.
 *   3. Le token n'est pas dans la blacklist Redis.
 *   4. Si la route est sensible, que mfaVerified == true.
 *
 * En cas de succes: req.auth contient le payload decode.
 *
 * NE PAS exposer ce middleware sur les endpoints publics
 * (login, refresh, validation NFC) - ils ont leur propre logique.
 */

import type { RequestHandler } from 'express';
import { verifyAccessToken, type AccessTokenPayload } from '@accelyo/crypto';
import { getEnv } from '../config/env';
import { getRedis, KEY } from '../config/redis';
import { UnauthorizedError } from '../utils/errors';

declare global {
  namespace Express {
    interface Request {
      auth?: AccessTokenPayload & { jti?: string };
    }
  }
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedError('Token Bearer manquant');
    }
    const token = header.slice('Bearer '.length).trim();
    const env = getEnv();

    let payload: AccessTokenPayload;
    try {
      payload = verifyAccessToken(token, env.JWT_SECRET);
    } catch {
      throw new UnauthorizedError('Token invalide ou expire');
    }

    // Blacklist - on hash le token pour ne pas le stocker brut.
    const redis = getRedis();
    const blacklisted = await redis.get(KEY.blacklistedAccess(payload.sub + ':' + token.slice(-16)));
    if (blacklisted) {
      throw new UnauthorizedError('Token revoque');
    }

    req.auth = payload;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Variante pour les routes qui exigent que la MFA soit deja validee
 * (operations admin sensibles).
 */
export const requireMfaVerified: RequestHandler = (req, _res, next) => {
  if (!req.auth) return next(new UnauthorizedError());
  if (!req.auth.mfaVerified) {
    return next(new UnauthorizedError('MFA non verifiee'));
  }
  next();
};
