/**
 * Validation de l'authentification etudiant (app mobile).
 */
import { z } from 'zod';
import { emailSchema, passwordSchema } from './common';

export const studentActivateSchema = z.object({
  token: z.string().min(10),
  password: passwordSchema,
});
export type StudentActivateInput = z.infer<typeof studentActivateSchema>;

export const studentLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});
export type StudentLoginInput = z.infer<typeof studentLoginSchema>;

export const studentConsentSchema = z.object({
  marketingConsent: z.boolean(),
});
export type StudentConsentInput = z.infer<typeof studentConsentSchema>;
