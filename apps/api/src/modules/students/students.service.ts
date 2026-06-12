/**
 * Service de gestion des etudiants.
 * ----------------------------------------------------------------
 * IMPORTANT - Modele de chiffrement:
 *   - Les champs sensibles (firstName, lastName, studentNumber, email)
 *     sont chiffres AES-256-GCM avant insertion en base.
 *   - En parallele, on stocke un HASH HMAC-SHA-256 (deterministe)
 *     pour permettre les recherches exactes (par numero, par email).
 *
 * Toute lecture renvoyee a un client passe par decryptStudent() pour
 * dechiffrer les champs avant de quitter le serveur.
 *
 * Si vous touchez aux champs chiffres, pensez:
 *   1. Aux migrations Prisma
 *   2. Aux scripts de seed/import
 *   3. Aux exports CSV/PDF
 */

import { encrypt, decrypt, hashSearchable } from '@accelyo/crypto';
import {
  issueActivation,
  studentPhotoKey,
} from '../student-auth/student-auth.service';
import { getPresignedUrl } from '../../services/storageService';
import { AuditAction, type Student, type ImportResult } from '@accelyo/shared';
import type { Request } from 'express';
import { getEnv } from '../../config/env';
import { prisma } from '../../config/database';
import { ConflictError, NotFoundError } from '../../utils/errors';
import { writeAudit } from '../../middleware/audit';

interface CreateInput {
  universityId: string;
  firstName: string;
  lastName: string;
  studentNumber: string;
  email: string;
  enrollmentYear: number;
  program?: string;
}

export async function createStudent(
  req: Request,
  input: CreateInput,
): Promise<Student> {
  const env = getEnv();
  const studentNumberHash = hashSearchable(input.studentNumber, env.ENCRYPTION_KEY);
  const emailHash = hashSearchable(input.email, env.ENCRYPTION_KEY);

  // Verifie l'unicite par tenant avant insertion - msg d'erreur explicite.
  const existing = await prisma.student.findFirst({
    where: {
      universityId: input.universityId,
      OR: [{ studentNumberHash }, { emailHash }],
    },
  });
  if (existing) {
    throw new ConflictError('Numero etudiant ou email deja utilise');
  }

  const created = await prisma.student.create({
    data: {
      universityId: input.universityId,
      firstNameEnc: encrypt(input.firstName, env.ENCRYPTION_KEY),
      lastNameEnc: encrypt(input.lastName, env.ENCRYPTION_KEY),
      studentNumberEnc: encrypt(input.studentNumber, env.ENCRYPTION_KEY),
      emailEnc: encrypt(input.email, env.ENCRYPTION_KEY),
      studentNumberHash,
      emailHash,
      enrollmentYear: input.enrollmentYear,
      program: input.program ?? null,
    },
  });

  writeAudit(req, {
    action: AuditAction.STUDENT_CREATED,
    resourceType: 'Student',
    resourceId: created.id,
    metadata: {
      enrollmentYear: input.enrollmentYear,
      program: input.program ?? null,
    },
  });

  // Lien d'activation de l'app etudiant (e-mail best-effort, ne bloque pas).
  await issueActivation(created.id, input.email);

  return decryptStudent(created);
}

export async function findStudents(opts: {
  universityId?: string;
  studentNumber?: string;
  email?: string;
  page: number;
  pageSize: number;
}): Promise<{ items: Student[]; total: number }> {
  const env = getEnv();
  const where: Record<string, unknown> = {};
  if (opts.universityId) where.universityId = opts.universityId;
  if (opts.studentNumber) {
    where.studentNumberHash = hashSearchable(
      opts.studentNumber,
      env.ENCRYPTION_KEY,
    );
  }
  if (opts.email) {
    where.emailHash = hashSearchable(opts.email, env.ENCRYPTION_KEY);
  }

  const [rows, total] = await Promise.all([
    prisma.student.findMany({
      where,
      skip: (opts.page - 1) * opts.pageSize,
      take: opts.pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.student.count({ where }),
  ]);
  const items = await Promise.all(rows.map(withPhotoUrl));
  return { items, total };
}

export async function findStudentById(id: string): Promise<Student> {
  const row = await prisma.student.findUnique({ where: { id } });
  if (!row) throw new NotFoundError('Etudiant introuvable');
  return withPhotoUrl(row);
}

/**
 * Suppression RGPD complete - cascade carte, devices, validations.
 * NE PAS confondre avec une simple desactivation.
 */
export async function gdprDeleteStudent(
  req: Request,
  id: string,
): Promise<void> {
  const row = await prisma.student.findUnique({ where: { id } });
  if (!row) throw new NotFoundError();

  // Le onDelete: Cascade gere automatiquement Card, Device, Validations.
  await prisma.student.delete({ where: { id } });

  writeAudit(req, {
    action: AuditAction.STUDENT_GDPR_DELETED,
    resourceType: 'Student',
    resourceId: id,
  });
}

/**
 * Import CSV (lignes deja parsees).
 * Strategy: insertions individuelles dans une transaction par batch
 * de 100 - on loggue les erreurs ligne par ligne pour permettre la
 * correction par l'admin.
 */
export async function importStudents(
  req: Request,
  universityId: string,
  rows: Array<CreateInput & { _row: number }>,
): Promise<ImportResult> {
  let inserted = 0;
  let updated = 0;
  const errors: Array<{ row: number; reason: string }> = [];

  for (const row of rows) {
    try {
      // upsert: si studentNumberHash existe deja dans le tenant, on met a jour.
      const env = getEnv();
      const studentNumberHash = hashSearchable(row.studentNumber, env.ENCRYPTION_KEY);
      const emailHash = hashSearchable(row.email, env.ENCRYPTION_KEY);

      const existing = await prisma.student.findFirst({
        where: {
          universityId,
          OR: [{ studentNumberHash }, { emailHash }],
        },
      });
      if (existing) {
        await prisma.student.update({
          where: { id: existing.id },
          data: {
            firstNameEnc: encrypt(row.firstName, env.ENCRYPTION_KEY),
            lastNameEnc: encrypt(row.lastName, env.ENCRYPTION_KEY),
            enrollmentYear: row.enrollmentYear,
            program: row.program ?? null,
          },
        });
        updated++;
      } else {
        await createStudent(req, { ...row, universityId });
        inserted++;
      }
    } catch (err) {
      errors.push({
        row: row._row,
        reason: err instanceof Error ? err.message : 'Erreur inconnue',
      });
    }
  }

  writeAudit(req, {
    action: AuditAction.STUDENT_IMPORTED,
    resourceType: 'Student',
    metadata: { universityId, inserted, updated, errorCount: errors.length },
  });

  return { totalRows: rows.length, inserted, updated, errors };
}

/**
 * Vue admin enrichie: dechiffre les champs + genere une URL presignee courte
 * (~300s) vers la photo si `photoHash` est present (sinon `photoUrl: null`).
 * Une URL presignee differente est emise a chaque appel (donnee perso).
 */
async function withPhotoUrl(row: Parameters<typeof decryptStudent>[0]): Promise<Student> {
  const dto = decryptStudent(row);
  if (row.photoHash) {
    try {
      dto.photoUrl = await getPresignedUrl(studentPhotoKey(row.id), 300);
    } catch {
      // MinIO indisponible / objet absent -> on degrade en null.
      dto.photoUrl = null;
    }
  }
  return dto;
}

/** Helper - dechiffre un row Prisma vers le DTO Student public. */
function decryptStudent(row: {
  id: string;
  universityId: string;
  firstNameEnc: string;
  lastNameEnc: string;
  studentNumberEnc: string;
  emailEnc: string;
  enrollmentYear: number;
  program: string | null;
  photoHash: string | null;
  physicalCardUid: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): Student {
  const env = getEnv();
  return {
    id: row.id,
    universityId: row.universityId,
    firstName: decrypt(row.firstNameEnc, env.ENCRYPTION_KEY),
    lastName: decrypt(row.lastNameEnc, env.ENCRYPTION_KEY),
    studentNumber: decrypt(row.studentNumberEnc, env.ENCRYPTION_KEY),
    email: decrypt(row.emailEnc, env.ENCRYPTION_KEY),
    enrollmentYear: row.enrollmentYear,
    program: row.program,
    // photoUrl est genere a la demande par MinIO presigned URL.
    photoUrl: null,
    physicalCardUid: row.physicalCardUid,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
