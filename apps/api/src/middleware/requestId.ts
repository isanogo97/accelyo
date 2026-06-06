/**
 * Genere un requestId pour chaque requete entrante.
 * Permet de tracer une requete dans tous les logs.
 */
import type { RequestHandler } from 'express';
import { randomUUID } from 'crypto';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export const requestIdMiddleware: RequestHandler = (req, res, next) => {
  // On accepte un requestId fourni par le reverse proxy s'il existe.
  const incoming = req.headers['x-request-id'];
  const id = typeof incoming === 'string' && incoming.length > 0
    ? incoming
    : randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
};
