/**
 * Types des cartes etudiantes dematerialisees.
 *
 * Une carte est composee de:
 *   - Un enregistrement Card en BDD (statut, expiration, UID Mifare emule)
 *   - Un token JWT signe RS256 (CardPayload) embarque dans l'app mobile
 *   - Une cle publique RSA distribuee aux lecteurs Elatec pour
 *     verification offline en cas de panne reseau.
 */

import type { CardStatus, Platform } from '../enums';

export interface Card {
  id: string;
  studentId: string;
  cardUid: string;
  status: CardStatus;
  issuedAt: string;
  expiresAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  revokedReason: string | null;
}

/**
 * Payload signe RS256 - c'est ce qui est emis via HCE NFC.
 * NE PAS modifier sans coordonner avec les lecteurs Elatec deployes,
 * sinon les anciennes cartes deviendront illisibles.
 */
export interface CardPayload {
  /** UUID etudiant (jamais le numero etudiant en clair). */
  sub: string;
  university_id: string;
  /** UID Mifare emule. */
  card_uid: string;
  /** Timestamp UNIX en secondes. */
  issued_at: number;
  /** Timestamp UNIX en secondes - expiration absolue. */
  expires_at: number;
  /** Permissions encodees - ex: ['door:building-A', 'printer:lab-3']. */
  permissions: string[];
  /** Hash de l'empreinte device pour binding telephone <-> carte. */
  fingerprint: string;
}

export interface Device {
  id: string;
  studentId: string;
  deviceFingerprint: string;
  deviceName: string | null;
  platform: Platform;
  registeredAt: string;
  lastActiveAt: string | null;
  isActive: boolean;
}

/** Reponse du serveur lors de l'enregistrement d'un appareil. */
export interface RegisterDeviceResponse {
  device: Device;
  /** Token a stocker dans le Keystore/Keychain - sert au binding. */
  deviceBindingToken: string;
}

/** Une entree d'historique pour /cards/:id/history. */
export interface CardValidationLog {
  id: string;
  readerId: string;
  readerLocation: string | null;
  validatedAt: string;
  success: boolean;
  failureReason: string | null;
}
