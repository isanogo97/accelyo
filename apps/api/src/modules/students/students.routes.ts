/**
 * Routes /api/v1/students/*
 */
import { Router } from 'express';
import multer from 'multer';
import { Role } from '@accelyo/shared';
import {
  postStudent,
  getStudents,
  getStudent,
  deleteStudent,
  postImport,
} from './students.controller';
import { requireAuth } from '../../middleware/auth';
import { requireRole, requireSameUniversity } from '../../middleware/rbac';
import { limiterStudentImport } from '../../middleware/rateLimiter';

// ATTENTION: Limite a 5 MB - augmenter avec precaution (memoire serveur).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const router = Router();

router.use(requireAuth);

router.get(
  '/',
  requireRole(Role.UNIVERSITY_ADMIN, Role.UNIVERSITY_STAFF),
  requireSameUniversity(),
  getStudents,
);
router.post(
  '/',
  requireRole(Role.UNIVERSITY_ADMIN),
  requireSameUniversity(),
  postStudent,
);
router.post(
  '/import',
  requireRole(Role.UNIVERSITY_ADMIN),
  limiterStudentImport,
  upload.single('file'),
  postImport,
);
router.get(
  '/:id',
  requireRole(Role.UNIVERSITY_ADMIN, Role.UNIVERSITY_STAFF),
  getStudent,
);
router.delete(
  '/:id/gdpr-delete',
  requireRole(Role.UNIVERSITY_ADMIN),
  deleteStudent,
);

export default router;
