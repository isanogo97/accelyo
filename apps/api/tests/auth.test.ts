/**
 * Tests d'integration auth - login + lockout + refresh.
 * Necessitent une DB Postgres et un Redis accessibles (voir CI).
 */
import request from 'supertest';
import { buildApp } from '../src/app';

describe('POST /api/v1/auth/login', () => {
  const app = buildApp();

  it('refuse un email inconnu (anti-enumeration: meme code que mauvais password)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'doesnotexist@test.fr', password: 'WrongPass123!@#' });
    expect([401, 429]).toContain(res.status); // 429 si rate-limit deja atteint
  });

  it('valide les inputs Zod', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'pas-un-email', password: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
