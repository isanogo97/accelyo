/** Tests /api/v1/me + verification du middleware requireAuth. */
import { api, resetDb, closeAll, superAdminToken, auth } from '../helpers/integration';

beforeEach(resetDb);
afterAll(closeAll);

describe('GET /api/v1/me', () => {
  it('renvoie le profil de l utilisateur authentifie', async () => {
    const token = await superAdminToken('me@accelyo.fr');
    const res = await api().get('/api/v1/me').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('me@accelyo.fr');
    expect(res.body.data.role).toBe('SUPER_ADMIN');
  });

  it('401 sans token', async () => {
    const res = await api().get('/api/v1/me');
    expect(res.status).toBe(401);
  });

  it('401 avec un token bidon', async () => {
    const res = await api().get('/api/v1/me').set(auth('pas.un.jwt'));
    expect(res.status).toBe(401);
  });
});

describe('404', () => {
  it('route inconnue renvoie 404 structure', async () => {
    const res = await api().get('/api/v1/nexistepas');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
