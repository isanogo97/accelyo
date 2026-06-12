/**
 * Routes /api/v1/content/*
 * ----------------------------------------------------------------
 * Acces: UNIVERSITY_ADMIN et CONTENT_EDITOR (Editeur). SUPER_ADMIN bypass.
 * AUCUN autre role n'a acces (ni STUDENT, ni UNIVERSITY_STAFF).
 *
 * Le scope tenant est applique dans le controleur:
 *   - non-super: universityId FORCE a req.auth.universityId.
 *   - SUPER_ADMIN: universityId fourni (query GET / body POST), 400 sinon.
 *
 * Ressources: annonces (infos), planning, prets (bibliotheque), bons plans.
 */
import { Router } from 'express';
import { Role } from '@accelyo/shared';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import * as ctrl from './content.controller';

const router = Router();

router.use(requireAuth);
router.use(requireRole(Role.UNIVERSITY_ADMIN, Role.CONTENT_EDITOR));

// Annonces / infos.
router.get('/announcements', ctrl.getAnnouncements);
router.post('/announcements', ctrl.postAnnouncement);
router.patch('/announcements/:id', ctrl.patchAnnouncement);
router.delete('/announcements/:id', ctrl.deleteAnnouncementCtrl);

// Planning.
router.get('/schedule', ctrl.getSchedule);
router.post('/schedule', ctrl.postSchedule);
router.patch('/schedule/:id', ctrl.patchSchedule);
router.delete('/schedule/:id', ctrl.deleteScheduleCtrl);

// Bibliotheque (prets).
router.get('/loans', ctrl.getLoans);
router.post('/loans', ctrl.postLoan);
router.patch('/loans/:id', ctrl.patchLoan);
router.delete('/loans/:id', ctrl.deleteLoanCtrl);

// Bons plans.
router.get('/deals', ctrl.getDeals);
router.post('/deals', ctrl.postDeal);
router.patch('/deals/:id', ctrl.patchDeal);
router.delete('/deals/:id', ctrl.deleteDealCtrl);

export default router;
