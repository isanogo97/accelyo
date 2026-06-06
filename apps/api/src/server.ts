/**
 * Point d'entree HTTP - lance le serveur.
 * ----------------------------------------------------------------
 * Gere:
 *   - Boot synchrone (env, BDD, Redis avant d'accepter du trafic)
 *   - Demarrage des jobs cron
 *   - Graceful shutdown sur SIGTERM/SIGINT
 *
 * NE PAS appeler buildApp() avant getEnv() - les middlewares lisent
 * la config d'env au boot et plantent si elle est invalide.
 */

import { buildApp } from './app';
import { getEnv } from './config/env';
import { disconnectDb, prisma } from './config/database';
import { disconnectRedis, getRedis } from './config/redis';
import { logger } from './utils/logger';
import { startCardExpirationJob } from './jobs/cardExpiration';
import { startCleanupLogsJob } from './jobs/cleanupLogs';

async function main() {
  const env = getEnv();

  // Verifie que les dependances critiques repondent avant d'ouvrir le port.
  await prisma.$queryRaw`SELECT 1`;
  await getRedis().ping();

  const app = buildApp();
  const server = app.listen(env.API_PORT, env.API_HOST, () => {
    logger.info(
      { port: env.API_PORT, host: env.API_HOST, env: env.NODE_ENV },
      'API en ecoute',
    );
  });

  // Jobs en arriere plan.
  startCardExpirationJob();
  startCleanupLogsJob();

  // Graceful shutdown.
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'shutting down...');
    server.close(async () => {
      await disconnectDb();
      await disconnectRedis();
      process.exit(0);
    });
    // ATTENTION: si le close traine plus de 10s on quitte de force,
    // sinon Docker tue le conteneur lui-meme apres 30s par defaut.
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err: unknown) => {
  logger.fatal({ err }, 'boot failed');
  process.exit(1);
});
