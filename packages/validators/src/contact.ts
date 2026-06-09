/**
 * Validation du formulaire de contact public (site vitrine).
 */
import { z } from 'zod';
import { emailSchema } from './common';

export const contactSchema = z.object({
  name: z.string().min(2, 'Nom requis').max(120),
  email: emailSchema,
  organization: z.string().max(160).optional().or(z.literal('')),
  message: z.string().min(10, 'Message trop court').max(5000),
});
export type ContactInput = z.infer<typeof contactSchema>;
