/**
 * Routes du portail etudiant (montees sous /api/v1/student-auth/me).
 * ----------------------------------------------------------------
 * Toutes les routes exigent un JWT etudiant valide (requireStudentAuth),
 * qui pose req.student = { id }. Les reponses sont enveloppees
 * { success: true, data: ... } par les controleurs.
 *
 * Sous-chemins: /schedule, /news, /loans, /loans/:id/renew, /deals.
 * Ils ne collisionnent pas avec /me, /me/consent, /me/wallet/google.
 */
import { Router } from 'express';
import { requireStudentAuth } from '../student-auth/student-auth.middleware';
import {
  scheduleHandler,
  newsHandler,
  loansHandler,
  renewLoanHandler,
  dealsHandler,
} from './student-portal.controller';

const router = Router();

router.use(requireStudentAuth);

router.get('/schedule', scheduleHandler);
router.get('/news', newsHandler);
router.get('/loans', loansHandler);
router.post('/loans/:id/renew', renewLoanHandler);
router.get('/deals', dealsHandler);

export default router;
