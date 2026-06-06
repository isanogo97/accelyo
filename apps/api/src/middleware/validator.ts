/**
 * Validateur Zod generique.
 * ----------------------------------------------------------------
 * Wrap un schema Zod et l'applique sur req.body / req.query / req.params.
 * En cas d'erreur, on re-throw une ZodError qui sera attrappe par
 * errorHandler et convertie en 400.
 *
 * Apres validation, le handler peut typer ses donnees:
 *   const data = req.body as z.infer<typeof mySchema>;
 */

import type { RequestHandler } from 'express';
import type { ZodSchema } from 'zod';

export function validateBody<T>(schema: ZodSchema<T>): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) return next(result.error);
    req.body = result.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) return next(result.error);
    // ATTENTION: req.query est readonly en Express 5 - pour rester compatible
    // on copie les donnees validees dans res.locals plutot que de muter.
    (req as { validated?: { query?: unknown } }).validated = {
      ...((req as { validated?: object }).validated ?? {}),
      query: result.data,
    };
    next();
  };
}

export function validateParams<T>(schema: ZodSchema<T>): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) return next(result.error);
    next();
  };
}
