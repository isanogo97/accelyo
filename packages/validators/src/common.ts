/**
 * Schemas reutilises a travers le code.
 */
import { z } from 'zod';

/** UUID v4 (Prisma genere des UUID v4 par defaut). */
export const uuidSchema = z.string().uuid();

/** Pagination standardisee. */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type PaginationInput = z.infer<typeof paginationSchema>;

/**
 * Email avec normalisation - on lowercase pour eviter les doublons
 * du genre "Foo@bar.fr" / "foo@bar.fr".
 */
export const emailSchema = z
  .string()
  .email()
  .max(254)
  .transform((v) => v.trim().toLowerCase());

/**
 * Mot de passe fort. Minimum 12 caracteres - aligne avec ANSSI 2021.
 * Doit contenir au moins une majuscule, une minuscule, un chiffre,
 * et un caractere special.
 */
export const passwordSchema = z
  .string()
  .min(12, 'Minimum 12 caracteres')
  .max(128)
  .regex(/[a-z]/, 'Au moins une minuscule')
  .regex(/[A-Z]/, 'Au moins une majuscule')
  .regex(/[0-9]/, 'Au moins un chiffre')
  .regex(/[^A-Za-z0-9]/, 'Au moins un caractere special');

/**
 * Mot de passe ETUDIANT - assoupli pour l'adoption: 12 caracteres minimum,
 * sans complexite imposee (les etudiants sont des utilisateurs de masse).
 */
export const studentPasswordSchema = z
  .string()
  .min(12, 'Minimum 12 caracteres')
  .max(128);
