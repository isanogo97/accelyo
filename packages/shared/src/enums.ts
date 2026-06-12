/**
 * Enums globaux Accelyo
 * ----------------------------------------------------------------
 * ATTENTION: Ces valeurs sont egalement persistees en base via Prisma
 * (voir apps/api/prisma/schema.prisma). Si vous renommez une valeur
 * ici, vous DEVEZ aussi:
 *   1. Mettre a jour le schema Prisma
 *   2. Generer une migration de base
 *   3. Mettre a jour les fichiers .seed.ts s'il en existe
 *
 * Renommer un enum sans migration = corruption silencieuse des donnees.
 */

/**
 * Roles utilisateurs - controle d'acces RBAC.
 * ATTENTION: Les valeurs DOIVENT etre identiques a celles de l'enum Role
 * cote Prisma (apps/api/prisma/schema.prisma). Sinon le RBAC echoue
 * silencieusement (token role mismatch -> FORBIDDEN sur tout).
 */
export enum Role {
  /** Equipe Accelyo - acces total a tous les tenants. */
  SUPER_ADMIN = 'SUPER_ADMIN',
  /** Responsable d'une universite - gere son perimetre. */
  UNIVERSITY_ADMIN = 'UNIVERSITY_ADMIN',
  /** Personnel universite - lecture seule (scolarite, etc.). */
  UNIVERSITY_STAFF = 'UNIVERSITY_STAFF',
  /** Editeur - gere uniquement le contenu (planning, infos, biblio, bons plans). */
  CONTENT_EDITOR = 'CONTENT_EDITOR',
  /** Etudiant - voit uniquement sa propre carte. */
  STUDENT = 'STUDENT',
}

/** Statuts possibles d'une carte etudiante dematerialisee. */
export enum CardStatus {
  /** Carte valide et utilisable. */
  ACTIVE = 'ACTIVE',
  /** Carte temporairement bloquee (perte de telephone par ex.). */
  SUSPENDED = 'SUSPENDED',
  /** Carte definitivement revoquee (ne peut etre reactivee). */
  REVOKED = 'REVOKED',
  /** Carte arrivee a expiration (fin d'annee universitaire). */
  EXPIRED = 'EXPIRED',
}

/** Mode de deploiement d'un tenant. */
export enum DeploymentMode {
  /** Hebergement Accelyo souverain (OVH/Scaleway France). */
  CLOUD = 'CLOUD',
  /** Hebergement sur les serveurs de l'universite. */
  ON_PREMISE = 'ON_PREMISE',
}

/** Plateformes supportees pour les appareils etudiants. */
export enum Platform {
  ANDROID = 'ANDROID',
  IOS = 'IOS',
}

/**
 * Types d'actions consignees dans le journal d'audit.
 * NE PAS TOUCHER aux valeurs existantes - elles sont referencees
 * dans les rapports d'audit et les exports legaux.
 * On peut uniquement AJOUTER de nouvelles valeurs.
 */
export enum AuditAction {
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGIN_FAILED = 'USER_LOGIN_FAILED',
  USER_LOGOUT = 'USER_LOGOUT',
  USER_MFA_ENABLED = 'USER_MFA_ENABLED',
  USER_PASSWORD_RESET = 'USER_PASSWORD_RESET',
  STUDENT_CREATED = 'STUDENT_CREATED',
  STUDENT_UPDATED = 'STUDENT_UPDATED',
  STUDENT_IMPORTED = 'STUDENT_IMPORTED',
  STUDENT_GDPR_DELETED = 'STUDENT_GDPR_DELETED',
  CARD_ISSUED = 'CARD_ISSUED',
  CARD_REVOKED = 'CARD_REVOKED',
  CARD_SUSPENDED = 'CARD_SUSPENDED',
  CARD_REACTIVATED = 'CARD_REACTIVATED',
  CARD_VALIDATED = 'CARD_VALIDATED',
  DEVICE_REGISTERED = 'DEVICE_REGISTERED',
  DEVICE_REVOKED = 'DEVICE_REVOKED',
  UNIVERSITY_CREATED = 'UNIVERSITY_CREATED',
  UNIVERSITY_UPDATED = 'UNIVERSITY_UPDATED',
  READER_REGISTERED = 'READER_REGISTERED',
}
