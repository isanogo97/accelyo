/**
 * Job - expiration automatique des cartes.
 * ----------------------------------------------------------------
 * Tous les jours a 03:00, on passe les cartes ACTIVE dont expiresAt
 * est depasse au statut EXPIRED. Cela maintient les statistiques
 * exactes et libere les contraintes d'unicite si l'etudiant
 * recoit une nouvelle carte.
 *
 * NE PAS toucher au cron sans verifier qu'il ne tombe pas pendant
 * un creneau d'utilisation (cantine 12h-14h par ex.).
 */

import cron from 'node-cron';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export function startCardExpirationJob() {
  cron.schedule('0 3 * * *', async () => {
    try {
      const result = await prisma.card.updateMany({
        where: {
          status: 'ACTIVE',
          expiresAt: { lt: new Date() },
        },
        data: { status: 'EXPIRED' },
      });
      logger.info({ expired: result.count }, '[job] cards expired');
    } catch (err) {
      logger.error({ err }, '[job] cardExpiration failed');
    }
  });
}
