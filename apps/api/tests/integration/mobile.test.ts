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

async function studentNoCard(email = 'nocard@univ.fr', num = 'ETU40001') {
  const { token, universityId } = await universityAdmin(`adm-${num}@test.fr`);
  const s = await api().post('/api/v1/students').set(auth(token)).send({
    firstName: 'No', lastName: 'Card', studentNumber: num,
    email, universityId, enrollmentYear: 2025,
  });
  return { studentId: s.body.data.id as string, stoken: studentToken(s.body.data.id, universityId) };
}

describe('Mobile - branches d erreur et binding', () => {
  it('404 si fingerprint manquant', async () => {
    const { stoken } = await studentWithCard();
    const res = await api().get('/api/v1/mobile/card').set(auth(stoken));
    expect(res.status).toBe(404);
  });

  it('404 si l etudiant n a pas de carte', async () => {
    const { stoken } = await studentNoCard();
    const res = await api().get('/api/v1/mobile/card?fingerprint=device-abcdef123456').set(auth(stoken));
    expect(res.status).toBe(404);
  });

  it('refuse un 3e appareil (max 2 actifs, 409)', async () => {
    const { stoken } = await studentWithCard();
    for (let i = 1; i <= 2; i++) {
      const r = await api().post('/api/v1/mobile/device/register').set(auth(stoken)).send({
        deviceFingerprint: `fingerprint-device-num-${i}-abcdef`,
        platform: 'ANDROID',
      });
      expect(r.status).toBe(201);
    }
    const third = await api().post('/api/v1/mobile/device/register').set(auth(stoken)).send({
      deviceFingerprint: 'fingerprint-device-num-3-abcdef',
      platform: 'IOS',
    });
    expect(third.status).toBe(409);
  });

  it('desinscrit un appareil (204)', async () => {
    const { stoken } = await studentWithCard();
    const reg = await api().post('/api/v1/mobile/device/register').set(auth(stoken)).send({
      deviceFingerprint: 'fingerprint-a-desinscrire-1234',
      platform: 'ANDROID',
    });
    const del = await api().delete(`/api/v1/mobile/device/${reg.body.data.id}`).set(auth(stoken));
    expect(del.status).toBe(204);
  });
});
