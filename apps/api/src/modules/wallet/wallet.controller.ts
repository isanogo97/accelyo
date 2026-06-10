/**
 * Controllers HTTP du module wallet.
 */
import type { Request, Response, NextFunction } from 'express';
import { buildGoogleWalletSaveUrl } from './wallet.service';
import { respondOk } from '../../utils/respond';

export async function getGoogleWalletLink(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const saveUrl = await buildGoogleWalletSaveUrl(req.params.studentId);
    respondOk(res, { saveUrl });
  } catch (e) {
    next(e);
  }
}
