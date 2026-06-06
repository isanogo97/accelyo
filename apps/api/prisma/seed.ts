/**
 * Seed initial - cree un super admin de bootstrap.
 *
 * ATTENTION: Ce script est destine a un environnement de developpement
 * ou au tout premier deploiement. Il NE doit PAS etre execute en production
 * une fois qu'un super admin existe deja.
 *
 * Usage:
 *   npx prisma db seed
 *
 * Apres l'execution, CHANGER IMMEDIATEMENT le mot de passe via le dashboard.
 */

import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from '@accelyo/crypto';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@accelyo.fr';
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!password) {
    throw new Error(
      'SEED_ADMIN_PASSWORD doit etre defini en variable d\'env pour seed - ' +
      'minimum 12 caracteres avec majuscule/minuscule/chiffre/special.',
    );
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    console.log(`[seed] Super admin ${email} existe deja - aucun changement.`);
    return;
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      role: Role.SUPER_ADMIN,
      isActive: true,
    },
  });
  console.log(`[seed] Super admin cree: ${email}`);
  console.log('[seed] CHANGER LE MOT DE PASSE IMMEDIATEMENT.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
