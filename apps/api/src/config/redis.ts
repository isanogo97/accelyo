/**
 * Connexion Redis (singleton).
 * ----------------------------------------------------------------
 * Usage de Redis dans Accelyo:
 *   - Whitelist des refresh tokens (revocation possible).
 *   - Blacklist des access tokens compromis.
 *   - Stockage des nonces NFC (anti-replay, TTL 60s).
 *   - Backend du rate-limiter Express.
 *   - Cache de la liste de revocation des cartes (acces <1ms).
 *
 * IMPORTANT: utiliser des prefixes coherents pour les cles afin
 * d'eviter les collisions:
 *   - "rt:<jti>"        -> refresh token
 *   - "blk:<token>"     -> access token blacklist
 *   - "nfc:nonce:<x>"   -> nonce NFC consume
 *   - "rev:card:<id>"   -> carte revoquee
 *   - "rl:..."          -> rate limiter (gere par lib)
 */

import Redis from 'ioredis';
import { getEnv } from './env';
import { logger } from '../utils/logger';

let cached: Redis | null = null;

export function getRedis(): Redis {
  if (cached) return cached;
  const env = getEnv();
  cached = new Redis(env.REDIS_URL, {
    // Si Redis est down au boot, on retente plutot que de crasher.
    maxRetriesPerRequest: 3,
    lazyConnect: false,
  });
  cached.on('error', (err) => {
    // ATTENTION: ne pas logger l'URL - peut contenir le mot de passe.
    logger.error({ err: err.message }, '[redis] connection error');
  });
  return cached;
}

export async function disconnectRedis(): Promise<void> {
  if (cached) {
    await cached.quit();
    cached = null;
  }
}

// Helpers prefixes
export const KEY = {
  refreshToken: (jti: string) => `rt:${jti}`,
  blacklistedAccess: (jti: string) => `blk:${jti}`,
  nfcNonce: (nonce: string) => `nfc:nonce:${nonce}`,
  revokedCard: (cardId: string) => `rev:card:${cardId}`,
  mfaChallenge: (token: string) => `mfa:${token}`,
} as const;
