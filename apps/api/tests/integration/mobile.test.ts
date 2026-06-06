/**
 * Tests /api/v1/mobile/* avec un token role STUDENT.
 * Couvre la recuperation de la carte signee + le binding d appareil.
 */
import { api, resetDb, closeAll, universityAdmin, auth } from '../helpers/integration';
import { studentToken } from '../helpers/tokens';

beforeEach(resetDb);
afterAll(closeAll);

/** Cree un etudiant + sa carte, renvoie un token STUDENT pour cet etudiant. */
async function studentWithCard() {
  const { token, universityId } = await universityAdmin();
  const student = await api().post('/api/v1/students').set(auth(token)).send({
    firstName: 'Lina', lastName: 'Bah', studentNumber: 'ETU33333',
    email: 'lina@univ.fr', universityId, enrollmentYear: 2025,
  });
  const studentId = student.body.data.id as string;
  await api().post(`/api/v1/cards/issue/${studentId}`).set(auth(token)).send({});
  return { studentId, universityId, stoken: studentToken(studentId, universityId) };
}

describe('GET /api/v1/mobile/card', () => {
  it('renvoie la carte signee de l etudiant', async () => {
    const { stoken } = await studentWithCard();
    const res = await api()
      .get('/api/v1/mobile/card?fingerprint=device-fingerprint-abcdef123456')
      .set(auth(stoken));
    expect(res.status).toBe(200);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.card.status).toBe('ACTIVE');
  });

  it('403 pour un role non-STUDENT', async () => {
    const { token } = await universityAdmin();
    const res = await api().get('/api/v1/mobile/card?fingerprint=x').set(auth(token));
    expect(res.status).toBe(403);
  });
});

describe('POST /api/v1/mobile/device/register', () => {
  it('enregistre un appareil (201)', async () => {
    const { stoken } = await studentWithCard();
    const res = await api().post('/api/v1/mobile/device/register').set(auth(stoken)).send({
      deviceFingerprint: 'fingerprint-unique-1234567890',
      deviceName: 'Pixel 8',
      platform: 'ANDROID',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.isActive).toBe(true);
  });
});
