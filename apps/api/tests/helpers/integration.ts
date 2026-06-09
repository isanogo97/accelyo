/**
 * Harnais de tests d'integration.
 * ----------------------------------------------------------------
 * Fournit: l'app Express reelle, un client supertest, l'acces prisma/redis,
 * un reset complet de la base + factories pour fabriquer des donnees.
 *
 * PREREQUIS: une base Postgres de test migree + un Redis joignables
 * (voir apps/api/.env.test). resetDb() vide tout entre chaque test.
 */
import request from 'supertest';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/config/database';
import { getRedis } from '../../src/config/redis';
import { hashPassword } from '@accelyo/crypto';
import { Role, DeploymentMode } from '@accelyo/shared';

export const app = buildApp();
export const api = () => request(app);

/** Mot de passe de tous les comptes de test (respecte passwordSchema). */
export const TEST_PASSWORD = 'TestPassw0rd!@#';

/** Vide toutes les tables + le Redis de test. A appeler en beforeEach. */
export async function resetDb(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "ContactRequest","AuditLog","CardValidation","Device","Card","Student","NfcReader","User","University" RESTART IDENTITY CASCADE;',
  );
  await getRedis().flushdb();
}

/** Ferme les connexions (a appeler en afterAll). */
export async function closeAll(): Promise<void> {
  await prisma.$disconnect();
  getRedis().disconnect();
}

export async function createUniversity(
  overrides: Partial<{ name: string; domain: string; deploymentMode: DeploymentMode }> = {},
) {
  return prisma.university.create({
    data: {
      name: overrides.name ?? 'Universite Test',
      domain: overrides.domain ?? `test-${Math.random().toString(36).slice(2, 8)}.fr`,
      deploymentMode: overrides.deploymentMode ?? DeploymentMode.CLOUD,
    },
  });
}

export async function createUser(opts: {
  email: string;
  role: Role;
  universityId?: string;
  mfaEnabled?: boolean;
}) {
  return prisma.user.create({
    data: {
      email: opts.email,
      passwordHash: await hashPassword(TEST_PASSWORD),
      role: opts.role,
      universityId: opts.universityId ?? null,
      mfaEnabled: opts.mfaEnabled ?? false,
      isActive: true,
    },
  });
}

/** Cree un super admin et renvoie son access token. */
export async function superAdminToken(email = 'super@accelyo.fr'): Promise<string> {
  await createUser({ email, role: Role.SUPER_ADMIN });
  return loginToken(email);
}

/** Cree une univ + un admin d'univ, renvoie { universityId, token }. */
export async function universityAdmin(email = 'admin@test.fr') {
  const univ = await createUniversity();
  await createUser({ email, role: Role.UNIVERSITY_ADMIN, universityId: univ.id });
  const token = await loginToken(email);
  return { universityId: univ.id, token, email };
}

/** Login via l'API et renvoie l'access token (echoue si MFA active). */
export async function loginToken(email: string): Promise<string> {
  const res = await api()
    .post('/api/v1/auth/login')
    .send({ email, password: TEST_PASSWORD });
  if (res.status !== 200 || !res.body?.data?.tokens?.accessToken) {
    throw new Error(`login echoue (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return res.body.data.tokens.accessToken as string;
}

/** Raccourci: header Authorization Bearer. */
export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
