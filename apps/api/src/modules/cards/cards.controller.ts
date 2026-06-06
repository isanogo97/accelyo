/**
 * Controllers HTTP pour /api/v1/cards/*
 */
import type { Request, Response, NextFunction } from 'express';
import { issueCardSchema, revokeCardSchema } from '@accelyo/validators';
import {
  issueCard,
  revokeCard,
  suspendCard,
  reactivateCard,
  getCardHistory,
  checkCardAccess,
} from './cards.service';
import { respondCreated, respondOk } from '../../utils/respond';

export async function postIssue(req: Request, res: Response, next: NextFunction) {
  try {
    const studentId = String(req.params.studentId);
    // Verifie que l'etudiant appartient bien au tenant de l'utilisateur.
    if (req.auth?.role !== 'SUPER_ADMIN') {
      const { prisma } = await import('../../config/database');
      const { NotFoundError } = await import('../../utils/errors');
      const s = await prisma.student.findUnique({
        where: { id: studentId },
        select: { universityId: true },
      });
      if (!s || s.universityId !== req.auth?.universityId) {
        throw new NotFoundError();
      }
    }
    const body = issueCardSchema.parse({ ...req.body, studentId });
    const card = await issueCard(req, {
      studentId,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      mifareUid: body.mifareUid,
    });
    respondCreated(res, card);
  } catch (e) {
    next(e);
  }
}

export async function postRevoke(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    await checkCardAccess(id, req.auth?.role, req.auth?.universityId);
    const body = revokeCardSchema.parse(req.body);
    const card = await revokeCard(req, id, body.reason);
    respondOk(res, card);
  } catch (e) {
    next(e);
  }
}

export async function postSuspend(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    await checkCardAccess(id, req.auth?.role, req.auth?.universityId);
    const body = revokeCardSchema.parse(req.body);
    const card = await suspendCard(req, id, body.reason);
    respondOk(res, card);
  } catch (e) {
    next(e);
  }
}

export async function postReactivate(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    await checkCardAccess(id, req.auth?.role, req.auth?.universityId);
    const card = await reactivateCard(req, id);
    respondOk(res, card);
  } catch (e) {
    next(e);
  }
}

export async function getHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    await checkCardAccess(id, req.auth?.role, req.auth?.universityId);
    const items = await getCardHistory(id);
    respondOk(res, items);
  } catch (e) {
    next(e);
  }
}
