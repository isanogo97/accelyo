/**
 * Routes /api/v1/auth/*
 */
import { Router } from 'express';
import {
  postLogin,
  postMfaVerify,
  postRefresh,
  postLogout,
  postMfaSetup,
  postMfaConfirm,
} from './auth.controller';
import {
  limiterAuthLogin,
  limiterAuthRefresh,
} from '../../middleware/rateLimiter';
import { requireAuth } from '../../middleware/auth';

const router = Router();

router.post('/login', limiterAuthLogin, postLogin);
router.post('/mfa/verify', limiterAuthLogin, postMfaVerify);
router.post('/refresh', limiterAuthRefresh, postRefresh);
router.post('/logout', postLogout);

// Endpoints d'activation MFA - necessitent d'etre deja authentifie.
router.post('/mfa/setup', requireAuth, postMfaSetup);
router.post('/mfa/confirm', requireAuth, postMfaConfirm);

export default router;
