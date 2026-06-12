/**
 * Routes /api/v1/team/*
 * ----------------------------------------------------------------
 * Acces: UNIVERSITY_ADMIN (SUPER_ADMIN bypass). Permet a l'admin
 * d'etablissement de designer/bloquer/restreindre des Editeurs et du staff.
 *
 * Perimetre verrouille dans le controleur: un admin n'agit QUE sur des users
 * de SON univ et de role STAFF/EDITEUR (jamais sur un autre admin ni
 * cross-tenant). Le SUPER_ADMIN fournit explicitement universityId.
 */
import { Router } from 'express';
import { Role } from '@accelyo/shared';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import * as ctrl from './team.controller';

const router = Router();

router.use(requireAuth);
router.use(requireRole(Role.UNIVERSITY_ADMIN));

router.get('/', ctrl.listTeam);
router.post('/', ctrl.createMember);
router.post('/:userId/block', ctrl.blockMember);
router.post('/:userId/unblock', ctrl.unblockMember);
router.post('/:userId/reset-password', ctrl.resetMemberPassword);
router.delete('/:userId', ctrl.deleteMember);

export default router;
