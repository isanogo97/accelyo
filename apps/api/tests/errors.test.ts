/** Tests des erreurs typees de l'API (mapping statut/code). */
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TooManyRequestsError,
} from '../src/utils/errors';

describe('erreurs typees', () => {
  it.each([
    [new BadRequestError(), 400, 'BAD_REQUEST'],
    [new UnauthorizedError(), 401, 'UNAUTHORIZED'],
    [new ForbiddenError(), 403, 'FORBIDDEN'],
    [new NotFoundError(), 404, 'NOT_FOUND'],
    [new ConflictError(), 409, 'CONFLICT'],
    [new TooManyRequestsError(), 429, 'TOO_MANY_REQUESTS'],
  ])('%s -> statut + code coherents', (err, status, code) => {
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(status);
    expect((err as AppError).code).toBe(code);
  });

  it('porte les erreurs de champ (validation)', () => {
    const e = new BadRequestError('invalide', { email: ['format'] });
    expect(e.fields).toEqual({ email: ['format'] });
  });
});
