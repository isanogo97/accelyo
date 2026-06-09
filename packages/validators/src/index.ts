/**
 * Package @accelyo/validators
 * ----------------------------------------------------------------
 * Schemas Zod pour valider TOUTES les entrees externes.
 *
 * REGLE: Aucun handler Express ne doit traiter une donnee non
 * passee par un schema Zod. La validation est OBLIGATOIRE meme
 * pour les requetes "internes" (autres services, workers, etc.).
 */

export * from './auth';
export * from './student';
export * from './card';
export * from './university';
export * from './nfc';
export * from './contact';
export * from './common';
