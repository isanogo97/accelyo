/**
 * Singleton Prisma Client.
 * ----------------------------------------------------------------
 * On instancie UN SEUL PrismaClient pour toute l'app. Plusieurs
 * instances ouvrent plusieurs pools de connexions PostgreSQL et
 * gachent les ressources.
 *
 * En dev (hot reload tsx), on stocke le client sur globalThis pour
 * eviter de recreer une instance a chaque rechargement.
 */

import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

export const prisma =
  globalThis.__prismaClient ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prismaClient = prisma;
}

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
}
