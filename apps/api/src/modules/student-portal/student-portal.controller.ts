/**
 * Controleurs du portail etudiant.
 * ----------------------------------------------------------------
 * Handlers Express minces: ils extraient l'identite (req.student.id,
 * pose par requireStudentAuth), parsent les query params, delèguent
 * au service et enveloppent la reponse via respondOk.
 */
import type { Request, Response, NextFunction } from 'express';
import { respondOk } from '../../utils/respond';
import { UnauthorizedError } from '../../utils/errors';
import {
  getSchedule,
  getNews,
  getLoans,
  renewLoan,
  getDeals,
} from './student-portal.service';

/** Recupere l'id de l'etudiant authentifie ou leve 401. */
function studentId(req: Request): string {
  if (!req.student) throw new UnauthorizedError();
  return req.student.id;
}

/**
 * Parse une date ISO depuis la query. Retourne `fallback` si absente
 * ou invalide (on reste tolerant: le portail ne doit pas casser sur
 * un parametre malforme).
 */
function parseDate(raw: unknown, fallback: Date): Date {
  if (typeof raw !== 'string' || raw.length === 0) return fallback;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export async function scheduleHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const now = new Date();
    const from = parseDate(req.query.from, now);
    const defaultTo = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const to = parseDate(req.query.to, defaultTo);
    const data = await getSchedule(studentId(req), from, to);
    respondOk(res, data);
  } catch (e) {
    next(e);
  }
}

export async function newsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await getNews(studentId(req));
    respondOk(res, data);
  } catch (e) {
    next(e);
  }
}

export async function loansHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await getLoans(studentId(req));
    respondOk(res, data);
  } catch (e) {
    next(e);
  }
}

export async function renewLoanHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await renewLoan(studentId(req), req.params.id);
    respondOk(res, data);
  } catch (e) {
    next(e);
  }
}

export async function dealsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await getDeals(studentId(req));
    respondOk(res, data);
  } catch (e) {
    next(e);
  }
}
