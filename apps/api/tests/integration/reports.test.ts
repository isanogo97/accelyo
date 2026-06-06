/** Tests /api/v1/reports/* + /api/v1/izly/redirect. */
import { api, resetDb, closeAll, universityAdmin, superAdminToken, auth } from '../helpers/integration';
import { studentToken } from '../helpers/tokens';

beforeEach(resetDb);
afterAll(closeAll);

describe('Reports', () => {
  it('usage renvoie les metriques d adoption (200)', async () => {
    const { token } = await universityAdmin();
    const res = await api().get('/api/v1/reports/usage').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('adoptionRate');
    expect(res.body.data).toHaveProperty('validations30d');
  });

  it('audit renvoie une liste paginee (200)', async () => {
    const { token } = await universityAdmin();
    const res = await api().get('/api/v1/reports/audit?page=1&pageSize=10').set(auth(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it('un role STUDENT ne peut pas acceder aux reports (403)', async () => {
    const res = await api()
      .get('/api/v1/reports/usage')
      .set(auth(studentToken('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002')));
    expect(res.status).toBe(403);
  });
});

describe('Izly', () => {
  it('redirige en mode deeplink (200)', async () => {
    const token = await superAdminToken();
    const res = await api().get('/api/v1/izly/redirect').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.data.mode).toBe('deeplink');
  });
});
