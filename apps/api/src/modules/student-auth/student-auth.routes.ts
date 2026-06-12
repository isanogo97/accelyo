/**
 * Routes /api/v1/student-auth/*
 *   POST /activate         -> public: definir le mot de passe via le token
 *   POST /login            -> public: connexion etudiant
 *   GET  /me               -> etudiant: profil + carte + branding
 *   PATCH /me/consent      -> etudiant: consentement bons plans (RGPD)
 *   POST  /me/physical-card-> etudiant: lier l'UID de sa carte physique
 *   GET  /me/wallet/google -> etudiant: lien "save to Google Wallet"
 *   GET  /me/wallet/apple  -> etudiant: telecharge le .pkpass Apple Wallet
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
  getMyWalletApple,
  postPhysicalCard,
} from './student-auth.controller';

const router = Router();

router.post('/activate', limiterAuthLogin, postActivate);
router.post('/login', limiterAuthLogin, postLogin);

router.get('/me', requireStudentAuth, getMeHandler);
router.patch('/me/consent', requireStudentAuth, patchConsent);
router.post('/me/physical-card', requireStudentAuth, postPhysicalCard);
router.get('/me/wallet/google', requireStudentAuth, getMyWalletGoogle);
router.get('/me/wallet/apple', requireStudentAuth, getMyWalletApple);

router.post(
  '/resend/:studentId',
  requireAuth,
  requireRole(Role.UNIVERSITY_ADMIN, Role.SUPER_ADMIN),
  postResend,
);

export default router;
