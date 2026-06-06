/**
 * Validation des universites (tenants).
 */
import { z } from 'zod';
import { DeploymentMode } from '@accelyo/shared';

export const createUniversitySchema = z.object({
  name: z.string().min(2).max(200).trim(),
  domain: z
    .string()
    .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, 'Domaine invalide')
    .max(253),
  /** SIRET francais - 14 chiffres. */
  siret: z
    .string()
    .regex(/^\d{14}$/, 'SIRET invalide')
    .optional(),
  deploymentMode: z.nativeEnum(DeploymentMode),
});
export type CreateUniversityInput = z.infer<typeof createUniversitySchema>;

export const updateUniversitySchema = createUniversitySchema.partial();
export type UpdateUniversityInput = z.infer<typeof updateUniversitySchema>;
