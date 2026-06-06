/**
 * Package @accelyo/validators
 * ----------------------------------------------------------------
 * Schemas Zod pour valider TOUTES les entrees externes.
 *
 * REGLE: Aucun handler Express ne doit traiter une donnee non
 * passee par un schema Zod. La validation est OBLIGATOIRE meme
 * pour les requetes "internes" (autres services, workers, etc.).
 *
 * Pourquoi Zod et pas Joi/Yup ?
 *   - Inference TypeScript automatique (z.infer<typeof X>).
 *   - Compatible API + frontend (memes regles).
 *   - Performances acceptables et maintenu activement.
 */

export * from './auth';
export * from './student';
export * from './card';
export * from './university';
export * from './nfc';
export * from './common';
