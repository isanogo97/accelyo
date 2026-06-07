/**
 * Tests unitaires des middlewares de validation Zod (purs, sans BDD).
 */
import { z } from 'zod';
import type { Request, Response } from 'express';
import {
  validateBody,
  validateQuery,
  validateParams,
} from '../src/middleware/validator';

function run(
  mw: ReturnType<typeof validateBody>,
  req: Partial<Request>,
): Promise<unknown> {
  return new Promise((resolve) => {
    mw(req as Request, {} as Response, (err?: unknown) => resolve(err));
  });
}

const schema = z.object({ name: z.string().min(2) });

describe('validateBody', () => {
  it('laisse passer et normalise un body valide', async () => {
    const req = { body: { name: 'Bob' } } as Partial<Request>;
    const err = await run(validateBody(schema), req);
    expect(err).toBeUndefined();
    expect((req.body as { name: string }).name).toBe('Bob');
  });

  it('renvoie une erreur (ZodError) sur body invalide', async () => {
    const err = await run(validateBody(schema), { body: { name: 'x' } });
    expect(err).toBeDefined();
  });
});

describe('validateQuery', () => {
  it('stocke la query validee dans req.validated', async () => {
    const req = { query: { name: 'Alice' } } as unknown as Partial<Request>;
    const err = await run(validateQuery(schema), req);
    expect(err).toBeUndefined();
    expect((req as { validated?: { query?: { name: string } } }).validated?.query?.name).toBe('Alice');
  });

  it('renvoie une erreur sur query invalide', async () => {
    const err = await run(validateQuery(schema), { query: { name: 'x' } } as unknown as Partial<Request>);
    expect(err).toBeDefined();
  });
});

describe('validateParams', () => {
  it('laisse passer des params valides', async () => {
    const err = await run(validateParams(schema), { params: { name: 'Carla' } } as unknown as Partial<Request>);
    expect(err).toBeUndefined();
  });

  it('renvoie une erreur sur params invalides', async () => {
    const err = await run(validateParams(schema), { params: { name: 'x' } } as unknown as Partial<Request>);
    expect(err).toBeDefined();
  });
});
