/**
 * Constantes globales de l'API.
 * Centralisees ici pour faciliter les modifications coordonnees.
 */

/** Duree de vie des differents elements en secondes. */
export const TTL = {
  /** Refresh token Redis (7 jours). */
  REFRESH_TOKEN_SECONDS: 7 * 24 * 60 * 60,
  /** Nonce NFC (anti-replay). */
  NFC_NONCE_SECONDS: 60,
  /** Challenge MFA temporaire entre /login et /mfa/verify. */
  MFA_CHALLENGE_SECONDS: 300,
  /** Cache de revocation carte. */
  REVOKED_CARD_SECONDS: 24 * 60 * 60,
  /** Token de reset password. */
  RESET_PASSWORD_SECONDS: 60 * 60,
} as const;

/** Limites operationnelles. */
export const LIMITS = {
  /** Maximum d'appareils actifs par etudiant. */
  MAX_DEVICES_PER_STUDENT: 2,
  /** Tolerance horloge pour la validation NFC (ms). */
  NFC_TIMESTAMP_SKEW_MS: 30_000,
  /** Tentatives de login avant verrouillage compte. */
  MAX_LOGIN_FAILED_ATTEMPTS: 5,
  /** Duree de verrouillage en minutes. */
  LOCKOUT_DURATION_MINUTES: 15,
} as const;

/** Duree de validite par defaut des cartes (1 annee universitaire). */
export const CARD_DEFAULT_VALIDITY_DAYS = 365;
