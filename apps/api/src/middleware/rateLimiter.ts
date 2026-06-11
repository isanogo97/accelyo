/**
 * Rate limiting Redis-backed.
 * ----------------------------------------------------------------
 * Pourquoi Redis ?
 *   - Plusieurs instances de l'API peuvent partager la meme limite.
 *   - Les compteurs survivent aux redemarrages (sauf flush volontaire).
 *
 * Les limites sont fixees ENDPOINT par ENDPOINT - ne pas appliquer
 * une limite generique trop stricte qui bloquerait des cas legitimes
 * (par ex. 100 validations NFC/min sur les lecteurs cantine).
 */

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { getRedis } from '../config/redis';
import type { RequestHandler } from 'express';

function buildLimiter(opts: {
  windowMs: number;
  max: number;
  prefix: string;
  keyGenerator?: (req: import('express').Request) => string;
}): RequestHandler {
  return rateLimit({
    windowMs: opts.windowMs,
    max: opts.max,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      // ATTENTION: ne pas utiliser le meme prefix entre 2 limiters.
      prefix: `rl:${opts.prefix}:`,
      sendCommand: (...args: string[]) =>
        getRedis().call(...(args as [string, ...string[]])) as Promise<
          number | string
        >,
    }),
    keyGenerator:
      opts.keyGenerator ??
      ((req) => req.ip ?? 'unknown'),
    message: {
      success: false,
      error: { code: 'TOO_MANY_REQUESTS', message: 'Trop de requetes' },
    },
  });
}

// Limiteurs preconfigures - voir le brief technique pour la matrice.
export const limiterAuthLogin = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  prefix: 'auth.login',
});

export const limiterAuthRefresh = buildLimiter({
  windowMs: 60 * 1000,
  max: 10,
  prefix: 'auth.refresh',
});

export const limiterCardValidate = buildLimiter({
  windowMs: 60 * 1000,
  max: 100,
  prefix: 'card.validate',
});

export const limiterApiGeneral = buildLimiter({
  windowMs: 60 * 1000,
  max: 60,
  prefix: 'api.general',
});

export const limiterStudentImport = buildLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  prefix: 'student.import',
});
