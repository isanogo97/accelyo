/**
 * Controllers HTTP de l'authentification etudiant.
 */
import type { Request, Response, NextFunction } from 'express';
import {
  studentActivateSchema,
  studentLoginSchema,
  studentConsentSchema,
} from '@accelyo/validators';
import { decrypt } from '@accelyo/crypto';
import {
  activate,
  login,
  getMe,
  setConsent,
  issueActivation,
} from './student-auth.service';
import { buildGoogleWalletSaveUrl } from '../wallet/wallet.service';
import {
  isAppleWalletConfigured,
  buildApplePkpass,
} from '../wallet/apple-wallet.service';
import { issueCard } from '../cards/cards.service';
import { prisma } from '../../config/database';
import { getEnv } from '../../config/env';
import { respondOk } from '../../utils/respond';
import { NotFoundError } from '../../utils/errors';

export async function postActivate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const body = studentActivateSchema.parse(req.body);
    respondOk(res, await activate(req, body.token, body.password));
  } catch (e) {
    next(e);
  }
}

export async function postLogin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const body = studentLoginSchema.parse(req.body);
    respondOk(res, await login(body.email, body.password));
  } catch (e) {
    next(e);
  }
}

export async function getMeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.student) throw new Error('auth required');
    respondOk(res, await getMe(req.student.id));
  } catch (e) {
    next(e);
  }
}

export async function patchConsent(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.student) throw new Error('auth required');
    const body = studentConsentSchema.parse(req.body);
    await setConsent(req.student.id, body.marketingConsent);
    respondOk(res, { marketingConsent: body.marketingConsent });
  } catch (e) {
    next(e);
  }
}

export async function getMyWalletGoogle(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.student) throw new Error('auth required');
    // S'assurer qu'une carte existe avant de generer le passe (best-effort).
    try {
      await issueCard(req, { studentId: req.student.id });
    } catch {
      // carte deja active.
    }
    respondOk(res, { saveUrl: await buildGoogleWalletSaveUrl(req.student.id) });
  } catch (e) {
    next(e);
  }
}

/**
 * Genere et renvoie le passe Apple Wallet (.pkpass) de l'etudiant.
 * Tant que le certificat Apple n'est pas configure -> 503 explicite.
 */
export async function getMyWalletApple(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.student) throw new Error('auth required');

    if (!isAppleWalletConfigured()) {
      res.status(503).json({
        success: false,
        error: { message: 'Apple Wallet pas encore configure' },
      });
      return;
    }

    // S'assurer qu'une carte existe avant de generer le passe (best-effort).
    try {
      await issueCard(req, { studentId: req.student.id });
    } catch {
      // carte deja active.
    }

    const buf = await buildApplePkpass(req.student.id);
    res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="carte-accelyo.pkpass"',
    );
    res.send(buf);
  } catch (e) {
    next(e);
  }
}

/** Admin: (re)generer et renvoyer le lien d'activation d'un etudiant. */
export async function postResend(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const env = getEnv();
    const student = await prisma.student.findUnique({
      where: { id: req.params.studentId },
    });
    if (!student) throw new NotFoundError('Etudiant introuvable');
    const email = decrypt(student.emailEnc, env.ENCRYPTION_KEY);
    await issueActivation(student.id, email);
    respondOk(res, { sent: true });
  } catch (e) {
    next(e);
  }
}
