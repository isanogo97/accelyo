/**
 * Logger structure (Pino).
 * ----------------------------------------------------------------
 * En production: logs JSON line-delimited (consommables par Loki/ELK).
 * En dev: logs colores via pino-pretty.
 *
 * REGLE: Ne JAMAIS utiliser console.log en production - perd
 * les niveaux, perd la structure, perd la correlation.
 *
 * Champs contextuels recommandes:
 *   logger.info({ userId, requestId }, 'message')
 */

import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  redact: {
    // ATTENTION: ne jamais logger ces champs - secrets et donnees personnelles.
    paths: [
      'password',
      'passwordHash',
      'authorization',
      'cookie',
      'mfaSecret',
      'mfaCode',
      'apiKey',
      'apiKeyEnc',
      '*.password',
      '*.authorization',
      '*.token',
    ],
    censor: '[REDACTED]',
  },
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:standard' },
      }
    : undefined,
});
