/**
 * Controllers HTTP pour /api/v1/students/*
 */
import type { Request, Response, NextFunction } from 'express';
import { parse as csvParse } from 'csv-parse/sync';
import {
  createStudentSchema,
  studentQuerySchema,
} from '@accelyo/validators';
import {
  createStudent,
  findStudents,
  findStudentById,
  gdprDeleteStudent,
  importStudents,
} from './students.service';
import { respondCreated, respondOk, respondNoContent } from '../../utils/respond';
import { BadRequestError } from '../../utils/errors';

export async function postStudent(req: Request, res: Response, next: NextFunction) {
  try {
    const body = createStudentSchema.parse(req.body);
    const created = await createStudent(req, body);
    respondCreated(res, created);
  } catch (e) {
    next(e);
  }
}

/**
 * Liste paginee des etudiants.
 * REGLE D'ISOLATION TENANT:
 *   - SUPER_ADMIN: peut filtrer par universityId (ou voir tout les tenants
 *     s'il omet le param - utile pour la vue Accelyo globale).
 *   - UNIVERSITY_ADMIN/STAFF: on FORCE universityId = req.auth.universityId.
 *     Toute valeur differente fournie par le client est ECRASEE.
 *     Ne JAMAIS faire confiance au query param pour la sécurité.
 */
export async function getStudents(req: Request, res: Response, next: NextFunction) {
  try {
    const q = studentQuerySchema.parse(req.query);
    if (req.auth?.role !== 'SUPER_ADMIN') {
      q.universityId = req.auth?.universityId;
    }
    const result = await findStudents(q);
    respondOk(res, {
      items: result.items,
      page: q.page,
      pageSize: q.pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / q.pageSize),
    });
  } catch (e) {
    next(e);
  }
}

/**
 * Detail d'un etudiant.
 * Apres recuperation on verifie que l'utilisateur a bien acces a cette
 * universite (404 plutot que 403 pour ne pas reveler l'existence).
 */
export async function getStudent(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    const out = await findStudentById(id);
    if (
      req.auth?.role !== 'SUPER_ADMIN' &&
      out.universityId !== req.auth?.universityId
    ) {
      // 404 plutot que 403: ne pas confirmer l'existence d'un id hors perimetre.
      return next(new (await import('../../utils/errors')).NotFoundError());
    }
    respondOk(res, out);
  } catch (e) {
    next(e);
  }
}

export async function deleteStudent(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    // Verifie l'appartenance tenant avant suppression irreversible.
    if (req.auth?.role !== 'SUPER_ADMIN') {
      const student = await findStudentById(id);
      if (student.universityId !== req.auth?.universityId) {
        const { NotFoundError } = await import('../../utils/errors');
        throw new NotFoundError();
      }
    }
    await gdprDeleteStudent(req, id);
    respondNoContent(res);
  } catch (e) {
    next(e);
  }
}

/**
 * Endpoint d'import CSV.
 * Le fichier est upload via multipart/form-data champ "file".
 * Format CSV attendu (header obligatoire):
 *   firstName,lastName,studentNumber,email,enrollmentYear,program
 *
 * ATTENTION: Le fichier reste en memoire le temps du parsing.
 * Si vous augmentez la taille max, considerer un parsing en stream.
 */
export async function postImport(req: Request, res: Response, next: NextFunction) {
  try {
    const universityId =
      req.auth?.role === 'SUPER_ADMIN'
        ? String((req.body as { universityId?: string })?.universityId ?? '')
        : (req.auth?.universityId ?? '');
    if (!universityId) {
      throw new BadRequestError('universityId requis');
    }

    const file = (req as Request & { file?: { buffer: Buffer } }).file;
    if (!file) throw new BadRequestError('Fichier CSV manquant');

    const records = csvParse(file.buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Array<Record<string, string>>;

    const rows = records.map((r, idx) => ({
      _row: idx + 2, // ligne 1 = header
      universityId,
      firstName: r.firstName ?? '',
      lastName: r.lastName ?? '',
      studentNumber: r.studentNumber ?? '',
      email: r.email ?? '',
      enrollmentYear: parseInt(r.enrollmentYear ?? '0', 10),
      program: r.program || undefined,
    }));

    const result = await importStudents(req, universityId, rows);
    respondOk(res, result);
  } catch (e) {
    next(e);
  }
}
