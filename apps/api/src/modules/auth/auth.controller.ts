/**
 * Controllers HTTP du module auth.
 */
import type { Request, Response, NextFunction } from 'express';
import {
  loginSchema,
  mfaVerifySchema,
  refreshTokenSchema,
} from '@accelyo/validators';
import {
  login,
  verifyMfaChallenge,
  refreshTokens,
  logout,
  setupMfa,
  confirmMfa,
} from './auth.service';
import { respondOk, respondNoContent } from '../../utils/respond';

export async function postLogin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const body = loginSchema.parse(req.body);
    const result = await login(req, body.email, body.password);
    respondOk(res, result);
  } catch (e) {
    next(e);
  }
}

export async function postMfaVerify(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const body = mfaVerifySchema.parse(req.body);
    const tokens = await verifyMfaChallenge(req, body.challengeToken, body.code);
    respondOk(res, tokens);
  } catch (e) {
    next(e);
  }
}

export async function postRefresh(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const body = refreshTokenSchema.parse(req.body);
    const tokens = await refreshTokens(body.refreshToken);
    respondOk(res, tokens);
  } catch (e) {
    next(e);
  }
}

export async function postLogout(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const body = refreshTokenSchema.parse(req.body);
    await logout(body.refreshToken);
    respondNoContent(res);
  } catch (e) {
    next(e);
  }
}

export async function postMfaSetup(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.auth) throw new Error('auth required');
    const out = await setupMfa(req.auth.sub);
    respondOk(res, out);
  } catch (e) {
    next(e);
  }
}

export async function postMfaConfirm(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.auth) throw new Error('auth required');
    const code = String((req.body as { code?: string })?.code ?? '');
    const out = await confirmMfa(req, req.auth.sub, code);
    respondOk(res, out);
  } catch (e) {
    next(e);
  }
}
