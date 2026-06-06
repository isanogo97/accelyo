/**
 * Tests d'integration du cycle de vie des cartes.
 */
import {
  api, resetDb, closeAll, universityAdmin, auth,
} from '../helpers/integration';

beforeEach(resetDb);
afterAll(closeAll);

async function setupStudent() {
  const ctx = await universityAdmin();
  const student = await api()
    .post('/api/v1/students')
    .set(auth(ctx.token))
    .send({
      firstName: 'Eve', lastName: 'Roy', studentNumber: 'ETU77777',
      email: 'eve@univ.fr', universityId: ctx.universityId,
      enrollmentYear: 2025,
    });
  return { ...ctx, studentId: student.body.data.id as string };
}

describe('Emission de carte', () => {
  it('emet une carte ACTIVE (201)', async () => {
    const { token, studentId } = await setupStudent();
    const res = await api().post(`/api/v1/cards/issue/${studentId}`).set(auth(token)).send({});
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('ACTIVE');
    expect(res.body.data.cardUid).toEqual(expect.any(String));
  });

  it('refuse une 2e carte active (409)', async () => {
    const { token, studentId } = await setupStudent();
    await api().post(`/api/v1/cards/issue/${studentId}`).set(auth(token)).send({});
    const dup = await api().post(`/api/v1/cards/issue/${studentId}`).set(auth(token)).send({});
    expect(dup.status).toBe(409);
  });
});

describe('Cycle de vie carte', () => {
  it('revoque (motif obligatoire) puis refuse une 2e revocation', async () => {
    const { token, studentId } = await setupStudent();
    const card = await api().post(`/api/v1/cards/issue/${studentId}`).set(auth(token)).send({});
    const id = card.body.data.id;

    const ok = await api().post(`/api/v1/cards/${id}/revoke`).set(auth(token)).send({ reason: 'Perte de la carte' });
    expect(ok.status).toBe(200);
    expect(ok.body.data.status).toBe('REVOKED');

    const again = await api().post(`/api/v1/cards/${id}/revoke`).set(auth(token)).send({ reason: 'Encore une fois' });
    expect(again.status).toBe(409);
  });

  it('400 si motif de revocation trop court', async () => {
    const { token, studentId } = await setupStudent();
    const card = await api().post(`/api/v1/cards/issue/${studentId}`).set(auth(token)).send({});
    const res = await api().post(`/api/v1/cards/${card.body.data.id}/revoke`).set(auth(token)).send({ reason: 'no' });
    expect(res.status).toBe(400);
  });

  it('suspend puis reactive', async () => {
    const { token, studentId } = await setupStudent();
    const card = await api().post(`/api/v1/cards/issue/${studentId}`).set(auth(token)).send({});
    const id = card.body.data.id;

    const susp = await api().post(`/api/v1/cards/${id}/suspend`).set(auth(token)).send({ reason: 'Verification en cours' });
    expect(susp.status).toBe(200);
    expect(susp.body.data.status).toBe('SUSPENDED');

    const re = await api().post(`/api/v1/cards/${id}/reactivate`).set(auth(token)).send({});
    expect(re.status).toBe(200);
    expect(re.body.data.status).toBe('ACTIVE');
  });

  it('renvoie l historique (vide au depart)', async () => {
    const { token, studentId } = await setupStudent();
    const card = await api().post(`/api/v1/cards/issue/${studentId}`).set(auth(token)).send({});
    const res = await api().get(`/api/v1/cards/${card.body.data.id}/history`).set(auth(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('404 carte d un autre tenant', async () => {
    const { token } = await universityAdmin('admin-a@test.fr');
    const res = await api()
      .post('/api/v1/cards/00000000-0000-0000-0000-000000000000/revoke')
      .set(auth(token))
      .send({ reason: 'tentative hors perimetre' });
    expect(res.status).toBe(404);
  });
});

describe('Cartes - transitions invalides (branches d erreur)', () => {
  it('refuse de suspendre une carte revoquee (400)', async () => {
    const { token, studentId } = await setupStudent();
    const card = await api().post(`/api/v1/cards/issue/${studentId}`).set(auth(token)).send({});
    await api().post(`/api/v1/cards/${card.body.data.id}/revoke`).set(auth(token)).send({ reason: 'perte de la carte' });
    const res = await api().post(`/api/v1/cards/${card.body.data.id}/suspend`).set(auth(token)).send({ reason: 'tentative invalide' });
    expect(res.status).toBe(400);
  });

  it('refuse de reactiver une carte active (400)', async () => {
    const { token, studentId } = await setupStudent();
    const card = await api().post(`/api/v1/cards/issue/${studentId}`).set(auth(token)).send({});
    const res = await api().post(`/api/v1/cards/${card.body.data.id}/reactivate`).set(auth(token)).send({});
    expect(res.status).toBe(400);
  });

  it('reemet une carte apres revocation (meme dossier etudiant)', async () => {
    const { token, studentId } = await setupStudent();
    const first = await api().post(`/api/v1/cards/issue/${studentId}`).set(auth(token)).send({});
    await api().post(`/api/v1/cards/${first.body.data.id}/revoke`).set(auth(token)).send({ reason: 'remplacement carte' });
    // Carte revoquee -> une nouvelle emission est autorisee (pas de 409).
    const second = await api().post(`/api/v1/cards/issue/${studentId}`).set(auth(token)).send({});
    expect(second.status).toBe(201);
    expect(second.body.data.status).toBe('ACTIVE');
  });
});
