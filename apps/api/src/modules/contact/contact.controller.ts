/**
 * Controllers HTTP des demandes de contact.
 */
import type { Request, Response, NextFunction } from 'express';
import { contactSchema } from '@accelyo/validators';
import {
  createContactRequest,
  listContactRequests,
  markContactHandled,
} from './contact.service';
import { respondOk, respondCreated } from '../../utils/respond';

export async function postContact(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const body = contactSchema.parse(req.body);
    const out = await createContactRequest(req, body);
    respondCreated(res, out);
  } catch (e) {
    next(e);
  }
}

export async function getContacts(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const items = await listContactRequests();
    respondOk(res, { items });
  } catch (e) {
    next(e);
  }
}

export async function patchContact(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const handled = Boolean((req.body as { handled?: boolean })?.handled);
    const out = await markContactHandled(req.params.id, handled);
    respondOk(res, out);
  } catch (e) {
    next(e);
  }
}
