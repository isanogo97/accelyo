/** Tests RBAC (requireRole / requireSameUniversity) avec req mockes. */
import type { Request, Response } from 'express';
import { requireRole, requireSameUniversity } from '../src/middleware/rbac';
import { ForbiddenError, UnauthorizedError } from '../src/utils/errors';
import { Role } from '@accelyo/shared';

function run(mw: ReturnType<typeof requireRole>, req: Partial<Request>) {
  return new Promise<Error | undefined>((resolve) => {
    mw(req as Request, {} as Response, (err?: unknown) =>
      resolve(err as Error | undefined),
    );
  });
}

describe('requireRole', () => {
  it('refuse sans authentification', async () => {
    const err = await run(requireRole(Role.UNIVERSITY_ADMIN), {});
    expect(err).toBeInstanceOf(UnauthorizedError);
  });

  it('laisse passer le SUPER_ADMIN partout', async () => {
    const err = await run(requireRole(Role.UNIVERSITY_ADMIN), {
      auth: { sub: 'x', role: Role.SUPER_ADMIN, mfaVerified: true },
    } as Partial<Request>);
    expect(err).toBeUndefined();
  });

  it('accepte un role autorise', async () => {
    const err = await run(requireRole(Role.UNIVERSITY_ADMIN), {
      auth: { sub: 'x', role: Role.UNIVERSITY_ADMIN, mfaVerified: true },
    } as Partial<Request>);
    expect(err).toBeUndefined();
  });

  it('refuse un role insuffisant', async () => {
    const err = await run(requireRole(Role.UNIVERSITY_ADMIN), {
      auth: { sub: 'x', role: Role.STUDENT, mfaVerified: false },
    } as Partial<Request>);
    expect(err).toBeInstanceOf(ForbiddenError);
  });
});

describe('requireSameUniversity', () => {
  it('refuse l acces a une autre universite', async () => {
    const err = await run(requireSameUniversity('universityId'), {
      auth: { sub: 'x', role: Role.UNIVERSITY_ADMIN, universityId: 'A', mfaVerified: true },
      params: { universityId: 'B' },
      body: {},
      query: {},
    } as unknown as Partial<Request>);
    expect(err).toBeInstanceOf(ForbiddenError);
  });

  it('autorise sa propre universite', async () => {
    const err = await run(requireSameUniversity('universityId'), {
      auth: { sub: 'x', role: Role.UNIVERSITY_ADMIN, universityId: 'A', mfaVerified: true },
      params: { universityId: 'A' },
      body: {},
      query: {},
    } as unknown as Partial<Request>);
    expect(err).toBeUndefined();
  });

  it('SUPER_ADMIN traverse toutes les universites', async () => {
    const err = await run(requireSameUniversity('universityId'), {
      auth: { sub: 'x', role: Role.SUPER_ADMIN, mfaVerified: true },
      params: { universityId: 'Z' },
      body: {},
      query: {},
    } as unknown as Partial<Request>);
    expect(err).toBeUndefined();
  });
});
