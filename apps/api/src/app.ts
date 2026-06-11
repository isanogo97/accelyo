/**
 * Construction de l'application Express.
 * ----------------------------------------------------------------
 * Ordre des middlewares (DOIT etre respecte):
 *   1. requestId      -> trace dans tous les logs
 *   2. security       -> Helmet/CORS/compression
 *   3. parsers        -> JSON, cookies
 *   4. rate limiter general (par IP)
 *   5. routes
 *   6. 404 handler
 *   7. errorHandler   -> en dernier, sinon il n'attrape pas tout
 */

import express, { type Express, type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { openapiSpec } from './docs/openapi';
import { requestIdMiddleware } from './middleware/requestId';
import { buildSecurityMiddleware } from './middleware/security';
import { errorHandler } from './middleware/errorHandler';
import { limiterApiGeneral } from './middleware/rateLimiter';
import { NotFoundError } from './utils/errors';
import authRoutes from './modules/auth/auth.routes';
import meRoutes from './modules/me/me.routes';
import universitiesRoutes from './modules/universities/universities.routes';
import studentsRoutes from './modules/students/students.routes';
import cardsRoutes from './modules/cards/cards.routes';
import nfcRoutes from './modules/nfc/nfc.routes';
import izlyRoutes from './modules/izly/izly.routes';
import reportsRoutes from './modules/reports/reports.routes';
import mobileRoutes from './modules/mobile/mobile.routes';
import contactRoutes from './modules/contact/contact.routes';
import walletRoutes from './modules/wallet/wallet.routes';
import studentAuthRoutes from './modules/student-auth/student-auth.routes';

export function buildApp(): Express {
  const app = express();

  // Necessaire derriere un reverse proxy (nginx) - sinon req.ip = IP du proxy.
  app.set('trust proxy', 1);

  app.use(requestIdMiddleware);
  app.use(buildSecurityMiddleware());
  // ATTENTION: limite a 1MB. Pour les imports CSV, c'est multer qui prend
  // le relais avec sa propre limite (5MB) - voir students.routes.
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // Healthcheck (utilise par Docker/Kubernetes/load balancer).
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  // Documentation OpenAPI: UI interactive sur /docs, spec brute sur /docs.json.
  app.get('/docs.json', (_req: Request, res: Response) => {
    res.json(openapiSpec);
  });
  app.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(openapiSpec as unknown as Record<string, unknown>, {
      customSiteTitle: 'Accelyo API',
    }),
  );

  // Rate limiter general - applique a tout /api/.
  app.use('/api', limiterApiGeneral);

  // Routes par module.
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/me', meRoutes);
  app.use('/api/v1/universities', universitiesRoutes);
  app.use('/api/v1/students', studentsRoutes);
  app.use('/api/v1/cards', cardsRoutes);
  app.use('/api/v1/nfc', nfcRoutes);
  app.use('/api/v1/izly', izlyRoutes);
  app.use('/api/v1/reports', reportsRoutes);
  app.use('/api/v1/mobile', mobileRoutes);
  app.use('/api/v1/contact', contactRoutes);
  app.use('/api/v1/wallet', walletRoutes);
  app.use('/api/v1/student-auth', studentAuthRoutes);

  // 404 - DOIT etre apres les routes, AVANT errorHandler.
  app.use((_req, _res, next) => next(new NotFoundError('Route inconnue')));

  // Gestionnaire d'erreurs - DOIT etre le dernier middleware.
  app.use(errorHandler);

  return app;
}
