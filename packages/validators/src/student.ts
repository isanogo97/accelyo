/**
 * Validation des donnees etudiantes.
 *
 * ATTENTION: Le studentNumber suit un pattern alphanumerique majuscule.
 * Adapter le regex si une universite utilise un autre format
 * (au moment de l'integration via universites.config).
 */
import { z } from 'zod';
import { emailSchema, uuidSchema } from './common';

export const createStudentSchema = z.object({
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
  studentNumber: z
    .string()
    .regex(/^[A-Z0-9]{6,20}$/, 'Format numero etudiant invalide'),
  email: emailSchema,
  universityId: uuidSchema,
  enrollmentYear: z.number().int().min(2000).max(2100),
  program: z.string().max(200).optional(),
});
export type CreateStudentInput = z.infer<typeof createStudentSchema>;

/** Mise a jour partielle - tous les champs sont optionnels. */
export const updateStudentSchema = createStudentSchema.partial().omit({
  universityId: true, // Un etudiant ne change pas d'universite, on cree un nouveau dossier.
});
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;

/**
 * Filtres de recherche - pagination + recherche par numero ou email exact.
 * La recherche partielle (LIKE) est intentionnellement absente -
 * impossible techniquement avec les champs chiffres.
 */
export const studentQuerySchema = z.object({
  universityId: uuidSchema.optional(),
  studentNumber: z.string().optional(),
  email: emailSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type StudentQueryInput = z.infer<typeof studentQuerySchema>;
