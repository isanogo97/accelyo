/**
 * Gestionnaire d'erreurs global Express.
 * ----------------------------------------------------------------
 * DOIT etre enregistre EN DERNIER avec app.use(errorHandler), apres
 * toutes les routes. Sinon Express continue de chercher d'autres
 * middlewares et finit par renvoyer un 500 generique.
 *
 * Comportement:
 *   - Les AppError sont serialisees avec leur status / code / message.
 *   - Les ZodError sont converties en 400 avec les erreurs par champ.
 *   - Toute autre erreur => 500 + message generique (pas de fuite).
 *
 * ATTENTION: ne JAMAIS retourner err.message au client pour les
 * erreurs non-typees - cela peut leaker des stack traces ou des
 * details d'infrastructure.
 */

import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import type { ApiError } from '@accelyo/shared';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    const body: ApiError = {
      success: false,
      error: { code: err.code, message: err.message, fields: err.fields },
    };
    res.status(err.statusCode).json(body);
    return;
  }

  if (err instanceof ZodError) {
    const fields: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const path = issue.path.join('.') || '_root';
      if (!fields[path]) fields[path] = [];
      fields[path]!.push(issue.message);
    }
    const body: ApiError = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Donnees invalides',
        fields,
      },
    };
    res.status(400).json(body);
    return;
  }

  // Erreur inattendue - on la logge cote serveur, on cache le detail au client.
  logger.error(
    {
      err,
      path: req.path,
      method: req.method,
      requestId: (req as { requestId?: string }).requestId,
    },
    'Unhandled error',
  );

  const body: ApiError = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Erreur interne du serveur',
    },
  };
  res.status(500).json(body);
};
