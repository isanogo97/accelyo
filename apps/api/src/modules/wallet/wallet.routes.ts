/**
 * Routes /api/v1/wallet/*
 *   GET /google/:studentId -> lien "Ajouter a Google Wallet" pour la carte
 *   de l'etudiant.
 */
import { Router } from 'express';
import { Role } from '@accelyo/shared';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { getGoogleWalletLink } from './wallet.controller';

const router = Router();
router.use(requireAuth);

router.get(
  '/google/:studentId',
  requireRole(Role.SUPER_ADMIN, Role.UNIVERSITY_ADMIN, Role.UNIVERSITY_STAFF),
  getGoogleWalletLink,
);

export default router;
