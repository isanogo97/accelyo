/**
 * Tests d'integration du module universities + RBAC associe.
 */
import {
  api, resetDb, closeAll,
  superAdminToken, universityAdmin, createUniversity, auth,
} from '../helpers/integration';

beforeEach(resetDb);
afterAll(closeAll);

const univBody = {
  name: 'Universite Paris Test',
  domain: 'univ-paris-test.fr',
  deploymentMode: 'CLOUD',
};

describe('CRUD universites (SUPER_ADMIN)', () => {
  it('cree une universite (201)', async () => {
    const token = await superAdminToken();
    const res = await api().post('/api/v1/universities').set(auth(token)).send(univBody);
    expect(res.status).toBe(201);
    expect(res.body.data.domain).toBe('univ-paris-test.fr');
  });

  it('refuse un domaine deja utilise (409)', async () => {
    const token = await superAdminToken();
    await api().post('/api/v1/universities').set(auth(token)).send(univBody);
    const dup = await api().post('/api/v1/universities').set(auth(token)).send(univBody);
    expect(dup.status).toBe(409);
  });

  it('valide les entrees (400 domaine invalide)', async () => {
    const token = await superAdminToken();
    const res = await api()
      .post('/api/v1/universities')
      .set(auth(token))
      .send({ ...univBody, domain: 'PAS UN DOMAINE' });
    expect(res.status).toBe(400);
  });

  it('liste les universites (200)', async () => {
    const token = await superAdminToken();
    await createUniversity();
    const res = await api().get('/api/v1/universities').set(auth(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('modifie puis desactive une universite', async () => {
    const token = await superAdminToken();
    const u = await createUniversity();
    const upd = await api()
      .put(`/api/v1/universities/${u.id}`)
      .set(auth(token))
      .send({ name: 'Nouveau Nom' });
    expect(upd.status).toBe(200);
    expect(upd.body.data.name).toBe('Nouveau Nom');

    const del = await api().delete(`/api/v1/universities/${u.id}`).set(auth(token));
    expect(del.status).toBe(204);
  });

  it('cree un admin d universite et expose le mot de passe une fois', async () => {
    const token = await superAdminToken();
    const u = await createUniversity({ domain: 'sorbonne-test.fr' });
    const res = await api()
      .post(`/api/v1/universities/${u.id}/admins`)
      .set(auth(token))
      .send({ email: 'staff@sorbonne-test.fr', role: 'UNIVERSITY_ADMIN' });
    expect(res.status).toBe(201);
    expect(res.body.data.temporaryPassword).toEqual(expect.any(String));
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('expose les stats d une universite', async () => {
    const token = await superAdminToken();
    const u = await createUniversity();
    const res = await api().get(`/api/v1/universities/${u.id}/stats`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('adoptionRate');
  });
});

describe('Isolation tenant', () => {
  it('un admin d universite ne peut pas creer d universite (403)', async () => {
    const { token } = await universityAdmin();
    const res = await api().post('/api/v1/universities').set(auth(token)).send(univBody);
    expect(res.status).toBe(403);
  });

  it('un admin voit SA propre universite mais pas une autre (403)', async () => {
    const { token, universityId } = await universityAdmin();
    const mine = await api().get(`/api/v1/universities/${universityId}`).set(auth(token));
    expect(mine.status).toBe(200);

    const other = await createUniversity({ domain: 'autre-test.fr' });
    const forbidden = await api().get(`/api/v1/universities/${other.id}`).set(auth(token));
    expect(forbidden.status).toBe(403);
  });
});

describe('Universites - admins & branches d acces', () => {
  it('refuse un email admin deja utilise (409)', async () => {
    const token = await superAdminToken();
    const u = await createUniversity({ domain: 'dup-admin.fr' });
    const body = { email: 'staff@dup-admin.fr', role: 'UNIVERSITY_ADMIN' };
    await api().post(`/api/v1/universities/${u.id}/admins`).set(auth(token)).send(body);
    const dup = await api().post(`/api/v1/universities/${u.id}/admins`).set(auth(token)).send(body);
    expect(dup.status).toBe(409);
  });

  it('404 pour creer un admin sur une universite inexistante', async () => {
    const token = await superAdminToken();
    const res = await api()
      .post('/api/v1/universities/00000000-0000-0000-0000-000000000000/admins')
      .set(auth(token))
      .send({ email: 'x@y.fr', role: 'UNIVERSITY_STAFF' });
    expect(res.status).toBe(404);
  });

  it('liste les admins d une universite (200)', async () => {
    const token = await superAdminToken();
    const u = await createUniversity({ domain: 'list-admins.fr' });
    await api().post(`/api/v1/universities/${u.id}/admins`).set(auth(token))
      .send({ email: 'a@list-admins.fr', role: 'UNIVERSITY_STAFF' });
    const res = await api().get(`/api/v1/universities/${u.id}/admins`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('un admin voit les admins de SA fac mais pas d une autre (403)', async () => {
    const { token, universityId } = await universityAdmin('adm-own@test.fr');
    const own = await api().get(`/api/v1/universities/${universityId}/admins`).set(auth(token));
    expect(own.status).toBe(200);
    const other = await createUniversity({ domain: 'other-admins.fr' });
    const forbidden = await api().get(`/api/v1/universities/${other.id}/admins`).set(auth(token));
    expect(forbidden.status).toBe(403);
  });

  it('stats refusees a un admin hors perimetre (403)', async () => {
    const { token } = await universityAdmin('adm-stats@test.fr');
    const other = await createUniversity({ domain: 'other-stats.fr' });
    const res = await api().get(`/api/v1/universities/${other.id}/stats`).set(auth(token));
    expect(res.status).toBe(403);
  });
});
