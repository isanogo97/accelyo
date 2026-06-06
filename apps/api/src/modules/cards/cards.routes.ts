/**
 * Routes /api/v1/cards/*
 */
import { Router } from 'express';
import { Role } from '@accelyo/shared';
import {
  postIssue,
  postRevoke,
  postSuspend,
  postReactivate,
  getHistory,
} from './cards.controller';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';

const router = Router();
router.use(requireAuth);

router.post(
  '/issue/:studentId',
  requireRole(Role.UNIVERSITY_ADMIN),
  postIssue,
);
router.post('/:id/revoke', requireRole(Role.UNIVERSITY_ADMIN), postRevoke);
router.post('/:id/suspend', requireRole(Role.UNIVERSITY_ADMIN), postSuspend);
router.post('/:id/reactivate', requireRole(Role.UNIVERSITY_ADMIN), postReactivate);
router.get(
  '/:id/history',
  requireRole(Role.UNIVERSITY_ADMIN, Role.UNIVERSITY_STAFF),
  getHistory,
);

export default router;
