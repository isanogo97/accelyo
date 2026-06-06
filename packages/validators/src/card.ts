/**
 * Validation des operations sur les cartes etudiantes.
 */
import { z } from 'zod';
import { uuidSchema } from './common';

export const issueCardSchema = z.object({
  studentId: uuidSchema,
  /**
   * Date d'expiration - ISO 8601. Si non fournie, l'API la calcule
   * automatiquement (fin d'annee universitaire courante).
   */
  expiresAt: z.string().datetime().optional(),
  /**
   * UID Mifare a emuler. Optionnel: en migration depuis carte
   * physique, on peut reprendre l'UID existant pour ne pas
   * re-encoder les portes/copieurs.
   */
  mifareUid: z
    .string()
    .regex(/^[0-9A-Fa-f]{8,16}$/, 'UID Mifare invalide')
    .optional(),
});
export type IssueCardInput = z.infer<typeof issueCardSchema>;

export const revokeCardSchema = z.object({
  /** Motif obligatoire - figure dans l'audit log. */
  reason: z.string().min(5).max(500),
});
export type RevokeCardInput = z.infer<typeof revokeCardSchema>;

export const suspendCardSchema = z.object({
  reason: z.string().min(5).max(500),
});
