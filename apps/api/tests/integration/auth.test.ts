/**
 * Tests d'integration du module auth.
 * Couvre login (succes/echec/lockout/anti-enumeration), refresh rotatif,
 * logout idempotent, et le cycle MFA complet (setup -> confirm -> verify).
 */
import { authenticator } from 'otplib';
import {
  api,
  resetDb,
  closeAll,
  createUser,
  loginToken,
  auth,
  TEST_PASSWORD,
} from '../helpers/integration';
import { Role } from '@accelyo/shared';

beforeEach(resetDb);
afterAll(closeAll);

describe('POST /api/v1/auth/login', () => {
  it('emet des tokens pour des identifiants valides', async () => {
    await createUser({ email: 'a@test.fr', role: Role.SUPER_ADMIN });
    const res = await api().post('/api/v1/auth/login').send({
      email: 'a@test.fr',
      password: TEST_PASSWORD,
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tokens.accessToken).toEqual(expect.any(String));
    expect(res.body.data.tokens.refreshToken).toEqual(expect.any(String));
    expect(res.body.data.user.email).toBe('a@test.fr');
  });

  it('refuse un mauvais mot de passe (401)', async () => {
    await createUser({ email: 'a@test.fr', role: Role.SUPER_ADMIN });
    const res = await api().post('/api/v1/auth/login').send({
      email: 'a@test.fr',
      password: 'MauvaisPass1!',
    });
    expect(res.status).toBe(401);
  });

  it('anti-enumeration: meme code pour email inconnu', async () => {
    const res = await api().post('/api/v1/auth/login').send({
      email: 'inconnu@test.fr',
      password: 'MauvaisPass1!',
    });
    expect(res.status).toBe(401);
  });

  it('valide les entrees (400 sur email malforme)', async () => {
    const res = await api().post('/api/v1/auth/login').send({
      email: 'pas-un-email',
      password: '',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('verrouille le compte apres 5 echecs (429/423/401 puis blocage)', async () => {
    await createUser({ email: 'lock@test.fr', role: Role.SUPER_ADMIN });
    for (let i = 0; i < 5; i++) {
      await api().post('/api/v1/auth/login').send({
        email: 'lock@test.fr',
        password: 'Mauvais1!aaaa',
      });
    }
    // Meme avec le bon mot de passe, le compte est verrouille.
    const res = await api().post('/api/v1/auth/login').send({
      email: 'lock@test.fr',
      password: TEST_PASSWORD,
    });
    expect([401, 423, 429]).toContain(res.status);
  });
});

describe('POST /api/v1/auth/refresh', () => {
  it('effectue une rotation et invalide l ancien refresh token', async () => {
    await createUser({ email: 'r@test.fr', role: Role.SUPER_ADMIN });
    const login = await api().post('/api/v1/auth/login').send({
      email: 'r@test.fr',
      password: TEST_PASSWORD,
    });
    const oldRefresh = login.body.data.tokens.refreshToken;

    const first = await api().post('/api/v1/auth/refresh').send({ refreshToken: oldRefresh });
    expect(first.status).toBe(200);
    expect(first.body.data.accessToken).toEqual(expect.any(String));

    // L'ancien refresh ne doit plus marcher (rotation).
    const reuse = await api().post('/api/v1/auth/refresh').send({ refreshToken: oldRefresh });
    expect(reuse.status).toBe(401);
  });

  it('rejette un refresh token bidon (401)', async () => {
    const res = await api()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'x'.repeat(40) });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('revoque le refresh token (idempotent)', async () => {
    await createUser({ email: 'o@test.fr', role: Role.SUPER_ADMIN });
    const login = await api().post('/api/v1/auth/login').send({
      email: 'o@test.fr',
      password: TEST_PASSWORD,
    });
    const refresh = login.body.data.tokens.refreshToken;

    const out = await api().post('/api/v1/auth/logout').send({ refreshToken: refresh });
    expect(out.status).toBe(204);

    // Apres logout, le refresh est revoque.
    const after = await api().post('/api/v1/auth/refresh').send({ refreshToken: refresh });
    expect(after.status).toBe(401);
  });
});

describe('MFA cycle complet', () => {
  it('setup -> confirm -> login challenge -> verify', async () => {
    await createUser({ email: 'm@test.fr', role: Role.SUPER_ADMIN });
    const token = await loginToken('m@test.fr');

    // 1. Setup: recupere le secret.
    const setup = await api().post('/api/v1/auth/mfa/setup').set(auth(token)).send({});
    expect(setup.status).toBe(200);
    const secret = setup.body.data.secret as string;
    expect(secret).toEqual(expect.any(String));

    // 2. Confirm avec un code valide -> codes de secours.
    const confirm = await api()
      .post('/api/v1/auth/mfa/confirm')
      .set(auth(token))
      .send({ code: authenticator.generate(secret) });
    expect(confirm.status).toBe(200);
    expect(confirm.body.data.backupCodes).toHaveLength(8);

    // 3. Login renvoie desormais un challenge MFA (pas de tokens).
    const login = await api().post('/api/v1/auth/login').send({
      email: 'm@test.fr',
      password: TEST_PASSWORD,
    });
    expect(login.body.data.mfaChallengeToken).toEqual(expect.any(String));
    expect(login.body.data.tokens).toBeUndefined();

    // 4. Verify le code TOTP -> tokens emis.
    const verify = await api().post('/api/v1/auth/mfa/verify').send({
      challengeToken: login.body.data.mfaChallengeToken,
      code: authenticator.generate(secret),
    });
    expect(verify.status).toBe(200);
    expect(verify.body.data.accessToken).toEqual(expect.any(String));
  });
});

describe('POST /api/v1/auth/password (changement mot de passe)', () => {
  const NEW_PW = 'NouveauPass123!@#';

  it('change le mot de passe avec le bon mot de passe actuel (204)', async () => {
    await createUser({ email: 'cp@test.fr', role: Role.SUPER_ADMIN });
    const token = await loginToken('cp@test.fr');
    const res = await api()
      .post('/api/v1/auth/password')
      .set(auth(token))
      .send({ currentPassword: TEST_PASSWORD, newPassword: NEW_PW });
    expect(res.status).toBe(204);

    // L'ancien mot de passe ne marche plus, le nouveau oui.
    const oldLogin = await api()
      .post('/api/v1/auth/login')
      .send({ email: 'cp@test.fr', password: TEST_PASSWORD });
    expect(oldLogin.status).toBe(401);
    const newLogin = await api()
      .post('/api/v1/auth/login')
      .send({ email: 'cp@test.fr', password: NEW_PW });
    expect(newLogin.status).toBe(200);
  });

  it('refuse si le mot de passe actuel est faux (401)', async () => {
    await createUser({ email: 'cp2@test.fr', role: Role.SUPER_ADMIN });
    const token = await loginToken('cp2@test.fr');
    const res = await api()
      .post('/api/v1/auth/password')
      .set(auth(token))
      .send({ currentPassword: 'MauvaisActuel1!', newPassword: NEW_PW });
    expect(res.status).toBe(401);
  });

  it('refuse un nouveau mot de passe trop court (400)', async () => {
    await createUser({ email: 'cp3@test.fr', role: Role.SUPER_ADMIN });
    const token = await loginToken('cp3@test.fr');
    const res = await api()
      .post('/api/v1/auth/password')
      .set(auth(token))
      .send({ currentPassword: TEST_PASSWORD, newPassword: 'court' });
    expect(res.status).toBe(400);
  });

  it('exige une authentification (401)', async () => {
    const res = await api()
      .post('/api/v1/auth/password')
      .send({ currentPassword: TEST_PASSWORD, newPassword: NEW_PW });
    expect(res.status).toBe(401);
  });
});
