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
  /** UID de la carte physique liee (clair normalise) ou null. */
  physicalCardUid: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /**
   * Mode d'authentification de l'etablissement de l'etudiant
   * (vue admin). Permet au dashboard d'afficher/masquer le bouton
   * de reinitialisation du mot de passe. Optionnel: absent des
   * vues qui ne joignent pas l'universite.
   */
  establishmentAuthMode?: 'ACCELYO_PASSWORD' | 'SSO_ENT';
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
  physicalCardUid: string | null;
  physicalCardUidHash: string | null;
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
