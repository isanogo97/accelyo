/**
 * Erreurs typees de l'API.
 * ----------------------------------------------------------------
 * Toutes les erreurs metier doivent etre des sous-classes de AppError.
 * Le middleware errorHandler les serialise en reponse HTTP propre.
 *
 * NE PAS utiliser de simples `throw new Error(...)` - cela renvoie
 * un 500 au client et empeche de distinguer une erreur attendue
 * d'un bug serveur.
 */

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Requete invalide', fields?: Record<string, string[]>) {
    super(400, 'BAD_REQUEST', message, fields);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentification requise') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Acces refuse') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Ressource introuvable') {
    super(404, 'NOT_FOUND', message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflit') {
    super(409, 'CONFLICT', message);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Trop de requetes') {
    super(429, 'TOO_MANY_REQUESTS', message);
  }
}
