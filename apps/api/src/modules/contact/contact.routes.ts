/**
 * Routes /api/v1/contact/*
 *   POST   /            -> public (formulaire du site vitrine)
 *   GET    /            -> SUPER_ADMIN (consultation des demandes)
 *   PATCH  /:id         -> SUPER_ADMIN (marquer traitee / non traitee)
 */
import { Router } from 'express';
import { Role } from '@accelyo/shared';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import {
  postContact,
  getContacts,
  patchContact,
} from './contact.controller';

const router = Router();

router.post('/', postContact);
router.get('/', requireAuth, requireRole(Role.SUPER_ADMIN), getContacts);
router.patch('/:id', requireAuth, requireRole(Role.SUPER_ADMIN), patchContact);

export default router;
