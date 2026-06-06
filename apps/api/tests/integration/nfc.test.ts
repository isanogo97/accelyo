/**
 * Tests d'integration NFC: enregistrement lecteur + validation complete
 * (signature HMAC, anti-replay, carte active -> GRANTED).
 */
import { createHmac, randomBytes } from 'crypto';
import {
  api, resetDb, closeAll, universityAdmin, auth,
} from '../helpers/integration';

beforeEach(resetDb);
afterAll(closeAll);

/** Signe une requete NFC comme le ferait un lecteur Elatec. */
function sign(apiKey: string, p: { reader_id: string; reader_location: string; card_uid: string; timestamp: number; nonce: string }) {
  const msg = [p.reader_id, p.reader_location, p.card_uid, String(p.timestamp), p.nonce].join('|');
  return createHmac('sha256', apiKey).update(msg).digest('hex');
}

async function registerReader(token: string) {
  const res = await api().post('/api/v1/nfc/readers').set(auth(token)).send({
    reader_id: 'READER-001',
    label: 'Porte A',
    location: 'Batiment A - RDC',
  });
  return { apiKey: res.body.data.apiKey as string, status: res.status };
}

async function issueCardFor(token: string, universityId: string) {
  const student = await api().post('/api/v1/students').set(auth(token)).send({
    firstName: 'Sam', lastName: 'Nour', studentNumber: 'ETU55555',
    email: 'sam@univ.fr', universityId, enrollmentYear: 2025,
  });
  const card = await api().post(`/api/v1/cards/issue/${student.body.data.id}`).set(auth(token)).send({});
  return card.body.data.cardUid as string;
}

describe('Lecteurs NFC', () => {
  it('enregistre un lecteur et expose la cle API une fois (201)', async () => {
    const { token } = await universityAdmin();
    const r = await registerReader(token);
    expect(r.status).toBe(201);
    expect(r.apiKey).toMatch(/^[0-9a-f]{64}$/);
  });

  it('liste les lecteurs du tenant', async () => {
    const { token } = await universityAdmin();
    await registerReader(token);
    const res = await api().get('/api/v1/nfc/readers').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
  });
});

describe('POST /api/v1/nfc/validate (public)', () => {
  it('accorde l acces a une carte active signee correctement', async () => {
    const { token, universityId } = await universityAdmin();
    const { apiKey } = await registerReader(token);
    const cardUid = await issueCardFor(token, universityId);

    const base = {
      reader_id: 'READER-001',
      reader_location: 'Batiment A - RDC',
      card_uid: cardUid,
      timestamp: Date.now(),
      nonce: randomBytes(16).toString('hex'),
    };
    const res = await api()
      .post('/api/v1/nfc/validate')
      .send({ ...base, signature: sign(apiKey, base) });

    expect(res.status).toBe(200);
    expect(res.body.data.granted).toBe(true);
  });

  it('refuse une carte inconnue (granted:false, HTTP 200)', async () => {
    const { token } = await universityAdmin();
    const { apiKey } = await registerReader(token);

    const base = {
      reader_id: 'READER-001',
      reader_location: 'Batiment A - RDC',
      card_uid: 'AABBCCDDEE11',
      timestamp: Date.now(),
      nonce: randomBytes(16).toString('hex'),
    };
    const res = await api()
      .post('/api/v1/nfc/validate')
      .send({ ...base, signature: sign(apiKey, base) });

    expect(res.status).toBe(200);
    expect(res.body.data.granted).toBe(false);
    expect(res.body.data.reason).toBe('card_not_found');
  });

  it('refuse une signature invalide', async () => {
    const { token } = await universityAdmin();
    await registerReader(token);
    const res = await api().post('/api/v1/nfc/validate').send({
      reader_id: 'READER-001',
      reader_location: 'Batiment A - RDC',
      card_uid: 'AABBCCDDEE11',
      timestamp: Date.now(),
      nonce: randomBytes(16).toString('hex'),
      signature: 'f'.repeat(64),
    });
    expect(res.status).toBe(200);
    expect(res.body.data.granted).toBe(false);
  });

  it('400 sur payload NFC malforme', async () => {
    const res = await api().post('/api/v1/nfc/validate').send({ reader_id: 'x' });
    expect(res.status).toBe(400);
  });
});

describe('NFC - securite avancee (anti-replay, revocation, horloge)', () => {
  it('rejette le rejeu du meme nonce (anti-replay)', async () => {
    const { token, universityId } = await universityAdmin();
    const { apiKey } = await registerReader(token);
    const cardUid = await issueCardFor(token, universityId);
    const base = {
      reader_id: 'READER-001', reader_location: 'Batiment A - RDC',
      card_uid: cardUid, timestamp: Date.now(),
      nonce: randomBytes(16).toString('hex'),
    };
    const body = { ...base, signature: sign(apiKey, base) };
    const first = await api().post('/api/v1/nfc/validate').send(body);
    expect(first.body.data.granted).toBe(true);
    const replay = await api().post('/api/v1/nfc/validate').send(body);
    expect(replay.body.data.granted).toBe(false);
    expect(replay.body.data.reason).toBe('nonce_replay');
  });

  it('refuse une carte revoquee (blacklist Redis)', async () => {
    const { token, universityId } = await universityAdmin();
    const { apiKey } = await registerReader(token);
    const student = await api().post('/api/v1/students').set(auth(token)).send({
      firstName: 'Rev', lastName: 'Oke', studentNumber: 'ETU60001',
      email: 'revoke@univ.fr', universityId, enrollmentYear: 2025,
    });
    const card = await api().post(`/api/v1/cards/issue/${student.body.data.id}`).set(auth(token)).send({});
    await api().post(`/api/v1/cards/${card.body.data.id}/revoke`).set(auth(token)).send({ reason: 'Carte perdue' });
    const base = {
      reader_id: 'READER-001', reader_location: 'Porte A',
      card_uid: card.body.data.cardUid, timestamp: Date.now(),
      nonce: randomBytes(16).toString('hex'),
    };
    const res = await api().post('/api/v1/nfc/validate').send({ ...base, signature: sign(apiKey, base) });
    expect(res.body.data.granted).toBe(false);
    expect(res.body.data.reason).toBe('card_blacklisted');
  });

  it('refuse un horodatage hors tolerance (anti-replay #1)', async () => {
    const { token, universityId } = await universityAdmin();
    const { apiKey } = await registerReader(token);
    const cardUid = await issueCardFor(token, universityId);
    const base = {
      reader_id: 'READER-001', reader_location: 'Porte A',
      card_uid: cardUid, timestamp: Date.now() - 120000,
      nonce: randomBytes(16).toString('hex'),
    };
    const res = await api().post('/api/v1/nfc/validate').send({ ...base, signature: sign(apiKey, base) });
    expect(res.body.data.granted).toBe(false);
    expect(res.body.data.reason).toBe('timestamp_skew');
  });

  it('refuse un lecteur non enregistre', async () => {
    const base = {
      reader_id: 'INCONNU-999', reader_location: 'X',
      card_uid: 'AABBCCDDEE11', timestamp: Date.now(),
      nonce: randomBytes(16).toString('hex'),
    };
    const res = await api().post('/api/v1/nfc/validate').send({ ...base, signature: 'f'.repeat(64) });
    expect(res.body.data.granted).toBe(false);
    expect(res.body.data.reason).toBe('reader_not_registered');
  });
});
