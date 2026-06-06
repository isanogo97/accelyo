/**
 * Integration Izly - hub de redirection.
 * ----------------------------------------------------------------
 * Strategie:
 *   - Mode "deeplink" (par defaut): on renvoie une URL izly:// que
 *     l'app mobile ouvre. Marche partout, pas de partenariat requis.
 *   - Mode "api_partner": si un partenariat CROUS est negocie,
 *     on peut afficher le solde directement.
 *
 * Pour ajouter le mode api_partner: implementer izlyApiClient.ts
 * et completer le if dans getRedirect().
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../middleware/auth';
import { respondOk } from '../../utils/respond';
import { getEnv } from '../../config/env';

const router = Router();
router.use(requireAuth);

router.get('/redirect', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const env = getEnv();
    if (env.IZLY_MODE === 'deeplink') {
      respondOk(res, {
        mode: 'deeplink',
        url: 'izly://payment',
        // Optionnel: fallback web si l'app n'est pas installee.
        webFallback: 'https://www.izly.fr',
      });
      return;
    }
    // TODO: api_partner -> appeler l'API Izly avec env.IZLY_API_KEY
    respondOk(res, { mode: 'api_partner', balance: null });
  } catch (e) {
    next(e);
  }
});

export default router;
