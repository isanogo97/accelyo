/**
 * Tests d'integration du module wallet (Google Wallet).
 * En CI, Google Wallet n'est pas configure: on verifie surtout la
 * garde d'authentification (la generation reelle est testee en prod).
 */
import { api, resetDb, closeAll } from '../helpers/integration';

beforeEach(resetDb);
afterAll(closeAll);

describe('GET /api/v1/wallet/google/:studentId', () => {
  it('exige une authentification (401)', async () => {
    const res = await api().get('/api/v1/wallet/google/some-student-id');
    expect(res.status).toBe(401);
  });
});
