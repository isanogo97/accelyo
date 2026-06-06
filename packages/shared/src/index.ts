/**
 * Package @accelyo/shared
 * ----------------------------------------------------------------
 * Ce fichier est le point d'entree unique du package partage.
 *
 * ROLE: Centraliser les types TypeScript et les enums utilises
 * a la fois par l'API, le dashboard et l'application mobile.
 *
 * ATTENTION: Ne jamais mettre de logique metier ici. Uniquement
 * des types et constantes. Tout code executable doit aller dans
 * un autre package (crypto, validators, etc.).
 *
 * Si vous modifiez un type ici, pensez aux 3 apps qui en dependent:
 *   - apps/api       (backend)
 *   - apps/dashboard (front admin)
 *   - apps/mobile    (app etudiant)
 */

export * from './enums';
export * from './types/user';
export * from './types/university';
export * from './types/student';
export * from './types/card';
export * from './types/audit';
export * from './types/nfc';
export * from './types/api';
