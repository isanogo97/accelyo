/**
 * Routes /api/v1/student-auth/*
 *   POST /activate         -> public: definir le mot de passe via le token
 *   POST /login            -> public: connexion etudiant
 *   GET  /me               -> etudiant: profil + carte + branding
 *   PATCH /me/consent      -> etudiant: consentement bons plans (RGPD)
 *   POST /resend/:studentId-> admin: renvoyer le lien d'activation
 */
import { Router } from 'express';
import { Role } from '@accelyo/shared';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { limiterAuthLogin } from '../../middleware/rateLimiter';
import { requireStudentAuth } from './student-auth.middleware';
import {
  postActivate,
  postLogin,
  getMeHandler,
  patchConsent,
  postResend,
  getMyWalletGoogle,
} from './student-auth.controller';

const router = Router();

router.post('/activate', limiterAuthLogin, postActivate);
router.post('/login', limiterAuthLogin, postLogin);

router.get('/me', requireStudentAuth, getMeHandler);
router.patch('/me/consent', requireStudentAuth, patchConsent);
router.get('/me/wallet/google', requireStudentAuth, getMyWalletGoogle);

router.post(
  '/resend/:studentId',
  requireAuth,
  requireRole(Role.UNIVERSITY_ADMIN, Role.SUPER_ADMIN),
  postResend,
);

export default router;
