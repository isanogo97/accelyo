/**
 * Types utilisateurs (admin et staff).
 * NE CONTIENT PAS d'etudiants - voir types/student.ts.
 */

import type { Role } from '../enums';

/**
 * Utilisateur du dashboard admin.
 * ATTENTION: Le champ passwordHash n'est JAMAIS exposé via l'API.
 * Voir apps/api/src/modules/auth/auth.service.ts -> sanitizeUser().
 */
export interface User {
  id: string;
  email: string;
  role: Role;
  universityId: string | null;
  mfaEnabled: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  createdAt: string;
  updatedAt: string;
}

/** DTO renvoye apres login - contient les tokens et l'utilisateur. */
export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  /** Si true, l'etape MFA est requise avant d'utiliser accessToken. */
  mfaRequired: boolean;
}

/** DTO pour la creation d'un compte admin. */
export interface CreateUserInput {
  email: string;
  password: string;
  role: Role;
  universityId?: string;
}
