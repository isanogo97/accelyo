/**
 * Tests d'integration du module students (CRUD, pagination, RGPD, import CSV).
 */
import {
  api, resetDb, closeAll, universityAdmin, createUniversity, createUser, loginToken, auth,
} from '../helpers/integration';
import { Role } from '@accelyo/shared';

beforeEach(resetDb);
afterAll(closeAll);

function studentBody(universityId: string, n = 1) {
  return {
    firstName: 'Alice',
    lastName: 'Martin',
    studentNumber: `ETU${String(n).padStart(5, '0')}`,
    email: `alice${n}@univ.fr`,
    universityId,
    enrollmentYear: 2025,
    program: 'Informatique',
  };
}

describe('CRUD etudiants', () => {
  it('cree un etudiant (201)', async () => {
    const { token, universityId } = await universityAdmin();
    const res = await api()
      .post('/api/v1/students')
      .set(auth(token))
      .send(studentBody(universityId));
    expect(res.status).toBe(201);
    expect(res.body.data.id).toEqual(expect.any(String));
  });

  it('valide les entrees (400 numero etudiant invalide)', async () => {
    const { token, universityId } = await universityAdmin();
    const res = await api()
      .post('/api/v1/students')
      .set(auth(token))
      .send({ ...studentBody(universityId), studentNumber: 'bad lower' });
    expect(res.status).toBe(400);
  });

  it('liste paginee, isolee au tenant', async () => {
    const { token, universityId } = await universityAdmin();
    for (let i = 1; i <= 3; i++) {
      await api().post('/api/v1/students').set(auth(token)).send(studentBody(universityId, i));
    }
    const res = await api().get('/api/v1/students?page=1&pageSize=2').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(3);
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.totalPages).toBe(2);
  });

  it('recupere un etudiant par id', async () => {
    const { token, universityId } = await universityAdmin();
    const created = await api().post('/api/v1/students').set(auth(token)).send(studentBody(universityId));
    const res = await api().get(`/api/v1/students/${created.body.data.id}`).set(auth(token));
    expect(res.status).toBe(200);
  });

  it('404 sur un etudiant d un autre tenant', async () => {
    const { token } = await universityAdmin('a1@test.fr');
    // Etudiant cree dans une AUTRE universite par un autre admin.
    const otherUniv = await createUniversity({ domain: 'autre-etu.fr' });
    await createUser({ email: 'a2@autre-etu.fr', role: Role.UNIVERSITY_ADMIN, universityId: otherUniv.id });
    const token2 = await loginToken('a2@autre-etu.fr');
    const other = await api().post('/api/v1/students').set(auth(token2)).send(studentBody(otherUniv.id));

    const res = await api().get(`/api/v1/students/${other.body.data.id}`).set(auth(token));
    expect(res.status).toBe(404);
  });

  it('suppression RGPD (204)', async () => {
    const { token, universityId } = await universityAdmin();
    const created = await api().post('/api/v1/students').set(auth(token)).send(studentBody(universityId));
    const res = await api()
      .delete(`/api/v1/students/${created.body.data.id}/gdpr-delete`)
      .set(auth(token));
    expect(res.status).toBe(204);
  });
});

describe('Import CSV', () => {
  it('importe des etudiants depuis un CSV', async () => {
    const { token, universityId } = await universityAdmin();
    const csv = [
      'firstName,lastName,studentNumber,email,enrollmentYear,program',
      'Bob,Dupont,ETU90001,bob@univ.fr,2025,Math',
      'Carla,Lopez,ETU90002,carla@univ.fr,2024,Physique',
    ].join('\n');

    const res = await api()
      .post('/api/v1/students/import')
      .set(auth(token))
      .field('universityId', universityId)
      .attach('file', Buffer.from(csv), 'students.csv');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('400 si fichier manquant', async () => {
    const { token, universityId } = await universityAdmin();
    const res = await api()
      .post('/api/v1/students/import')
      .set(auth(token))
      .field('universityId', universityId);
    expect(res.status).toBe(400);
  });
});

describe('Import CSV - insertion puis mise a jour', () => {
  it('insere au 1er import puis met a jour au 2e (meme dossier)', async () => {
    const { token, universityId } = await universityAdmin();
    const csv = [
      'firstName,lastName,studentNumber,email,enrollmentYear,program',
      'Bob,Dupont,ETU90001,bob@univ.fr,2025,Math',
    ].join('\n');
    const first = await api().post('/api/v1/students/import').set(auth(token))
      .field('universityId', universityId).attach('file', Buffer.from(csv), 'a.csv');
    expect(first.status).toBe(200);
    const second = await api().post('/api/v1/students/import').set(auth(token))
      .field('universityId', universityId).attach('file', Buffer.from(csv), 'a.csv');
    expect(second.status).toBe(200);
  });
});
