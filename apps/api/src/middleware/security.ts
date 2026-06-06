/**
 * Pile de securite HTTP (Helmet, CORS, compression).
 * ----------------------------------------------------------------
 * Centralisation pour eviter les configurations dispersees.
 *
 * REGLES DE MODIFICATION:
 *   - CSP: tout ajout d'origine externe doit etre justifie en revue.
 *     Toute relaxation 'unsafe-eval' est INTERDITE.
 *   - HSTS: includeSubDomains + preload obligatoires en prod.
 *   - CORS: liste blanche stricte - jamais "*".
 */

import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import type { RequestHandler } from 'express';
import { getEnv } from '../config/env';

export function buildSecurityMiddleware(): RequestHandler[] {
  const env = getEnv();
  return [
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      hsts: {
        maxAge: 31_536_000,
        includeSubDomains: true,
        preload: true,
      },
      noSniff: true,
      xssFilter: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      crossOriginEmbedderPolicy: false,
    }),
    cors({
      // ATTENTION: ne JAMAIS mettre "*" en production.
      origin: (origin, cb) => {
        if (!origin) return cb(null, true); // Same-origin / outils internes
        if (env.CORS_ORIGINS.includes(origin)) return cb(null, true);
        cb(new Error('Origine non autorisee'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
      maxAge: 600,
    }),
    compression(),
  ];
}
