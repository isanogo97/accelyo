/**
 * Types des etudiants.
 *
 * IMPORTANT - Modele de chiffrement applicatif:
 * En base, les champs sensibles (firstName, lastName, studentNumber,
 * email) sont stockes CHIFFRES (AES-256-GCM). En parallele on stocke
 * un HASH HMAC-SHA-256 de ces champs pour permettre les recherches
 * exactes (numStudent, email).
 *
 * Le type Student ci-dessous represente la version DECHIFFREE,
 * telle que renvoyee aux clients autorises. Voir StudentRow pour
 * la representation BDD brute.
 */

export interface Student {
  id: string;
  universityId: string;
  firstName: string;
  lastName: string;
  studentNumber: string;
  email: string;
  enrollmentYear: number;
  program: string | null;
  /** URL signee MinIO si la photo a ete uploadee, sinon null. */
  photoUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Representation brute en BDD - NE JAMAIS exposer telle quelle.
 * Si vous l'utilisez, c'est uniquement cote serveur.
 */
export interface StudentRow {
  id: string;
  universityId: string;
  firstNameEnc: string;
  lastNameEnc: string;
  studentNumberEnc: string;
  emailEnc: string;
  studentNumberHash: string;
  emailHash: string;
  enrollmentYear: number;
  program: string | null;
  photoHash: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStudentInput {
  firstName: string;
  lastName: string;
  studentNumber: string;
  email: string;
  universityId: string;
  enrollmentYear: number;
  program?: string;
}

/** Resultat d'un import CSV/Excel - retourne par /students/import. */
export interface ImportResult {
  totalRows: number;
  inserted: number;
  updated: number;
  errors: Array<{ row: number; reason: string }>;
}
