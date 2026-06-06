/**
 * Job - nettoyage des logs de validation et anonymisation.
 * ----------------------------------------------------------------
 * Politique RGPD: les logs de validation NFC nominatifs sont anonymises
 * apres 90 jours. Les statistiques agregees sont conservees.
 *
 * IMPORTANT: NE JAMAIS supprimer les AuditLog avant 1 an
 * (obligation legale). Ce job ne touche PAS a la table AuditLog.
 */

import cron from 'node-cron';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

const RETENTION_DAYS = 90;

export function startCleanupLogsJob() {
  // Tous les dimanches a 04:00.
  cron.schedule('0 4 * * 0', async () => {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

      const result = await prisma.cardValidation.deleteMany({
        where: { validatedAt: { lt: cutoff } },
      });
      logger.info(
        { deleted: result.count, cutoff: cutoff.toISOString() },
        '[job] old validations cleaned',
      );
    } catch (err) {
      logger.error({ err }, '[job] cleanupLogs failed');
    }
  });
}
