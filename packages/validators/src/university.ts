/**
 * Validation des universites (tenants).
 */
import { z } from 'zod';
import { DeploymentMode } from '@accelyo/shared';

/**
 * Secteurs supportes pour un etablissement (tenant).
 * Doit rester aligne avec l'enum Prisma `Sector`
 * (SCHOOL | LIBRARY | COMPANY | ASSOCIATION).
 */
export const sectorSchema = z.enum([
  'SCHOOL',
  'LIBRARY',
  'COMPANY',
  'ASSOCIATION',
]);
export type Sector = z.infer<typeof sectorSchema>;

/** Couleur de marque au format hexadecimal (#rrggbb). */
export const brandColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Couleur hexadecimale invalide (ex: #2563eb)');

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
  /** Identite visuelle / branding du tenant. */
  sector: sectorSchema.optional(),
  brandColor: brandColorSchema.optional(),
  logoUrl: z.string().url('URL de logo invalide').max(2048).optional(),
  /** Coordonnees de l'etablissement. */
  address: z.string().max(200).optional(),
  city: z.string().max(120).optional(),
  postalCode: z.string().regex(/^\d{5}$/, 'Code postal a 5 chiffres').optional(),
});
export type CreateUniversityInput = z.infer<typeof createUniversitySchema>;

export const updateUniversitySchema = createUniversitySchema.partial();
export type UpdateUniversityInput = z.infer<typeof updateUniversitySchema>;
