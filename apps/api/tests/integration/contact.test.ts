/**
 * Tests d'integration du module contact (formulaire du site vitrine).
 * Couvre la soumission publique, la validation, et la liste reservee
 * aux SUPER_ADMIN.
 */
import {
  api,
  resetDb,
  closeAll,
  createUser,
  loginToken,
  auth,
} from '../helpers/integration';
import { Role } from '@accelyo/shared';

beforeEach(resetDb);
afterAll(closeAll);

describe('POST /api/v1/contact (public)', () => {
  it('cree une demande de contact (201)', async () => {
    const res = await api().post('/api/v1/contact').send({
      name: 'Jean Dupont',
      email: 'jean@univ.fr',
      organization: 'Universite Demo',
      message: 'Bonjour, nous aimerions une demonstration de la solution.',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.id).toEqual(expect.any(String));
  });

  it('valide les entrees (400 si message trop court)', async () => {
    const res = await api().post('/api/v1/contact').send({
      name: 'Jean',
      email: 'jean@univ.fr',
      message: 'court',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/v1/contact (SUPER_ADMIN)', () => {
  it('refuse sans authentification (401)', async () => {
    const res = await api().get('/api/v1/contact');
    expect(res.status).toBe(401);
  });

  it('liste les demandes pour un SUPER_ADMIN (200)', async () => {
    await api().post('/api/v1/contact').send({
      name: 'Alice',
      email: 'alice@univ.fr',
      message: 'Un message suffisamment long pour passer la validation.',
    });
    await createUser({ email: 'sa@test.fr', role: Role.SUPER_ADMIN });
    const token = await loginToken('sa@test.fr');
    const res = await api().get('/api/v1/contact').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
  });
});
