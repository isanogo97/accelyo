/**
 * Routes /api/v1/nfc/*
 *
 * /validate est PUBLIC (pas de JWT) - les lecteurs Elatec n'ont pas
 * de session utilisateur. La signature HMAC + reader_id dans le body
 * tient lieu d'authentification.
 */
import { Router } from 'express';
import { Role } from '@accelyo/shared';
import {
  postValidate,
  postRegisterReader,
  getReaders,
} from './nfc.controller';
import { limiterCardValidate } from '../../middleware/rateLimiter';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';

const router = Router();

// Endpoint public pour les lecteurs Elatec.
router.post('/validate', limiterCardValidate, postValidate);

// Endpoints admin (gestion du parc de lecteurs).
router.get(
  '/readers',
  requireAuth,
  requireRole(Role.UNIVERSITY_ADMIN, Role.UNIVERSITY_STAFF),
  getReaders,
);
router.post(
  '/readers',
  requireAuth,
  requireRole(Role.UNIVERSITY_ADMIN),
  postRegisterReader,
);

export default router;
