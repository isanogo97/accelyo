/**
 * Middleware d'authentification etudiant.
 * Verifie le JWT etudiant ET recharge le statut: si l'admin a desactive
 * l'etudiant ou l'etablissement, l'acces est coupe immediatement.
 */
import type { RequestHandler } from 'express';
import { prisma } from '../../config/database';
import { UnauthorizedError } from '../../utils/errors';
import { verifyStudentToken } from './student-auth.service';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      student?: { id: string };
    }
  }
}

export const requireStudentAuth: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedError('Token Bearer manquant');
    }
    const token = header.slice('Bearer '.length).trim();
    const studentId = verifyStudentToken(token);

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { university: true },
    });
    if (!student || !student.isActive || !student.university.isActive) {
      throw new UnauthorizedError('Acces revoque');
    }
    req.student = { id: student.id };
    next();
  } catch (err) {
    next(err);
  }
};
