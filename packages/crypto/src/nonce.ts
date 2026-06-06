/**
 * Generation de nonces cryptographiques.
 * ----------------------------------------------------------------
 * Un nonce = "Number used ONCE". Chaque transaction NFC en consomme un
 * different - cela empeche les attaques par rejeu (replay attack).
 *
 * Le nonce est stocke en Redis avec TTL de 60 secondes. Le serveur
 * verifie qu'il n'a pas deja ete vu avant de valider la transaction.
 */

import { randomBytes } from 'crypto';

/** 16 bytes = 128 bits d'entropie - largement suffisant. */
export function generateNonce(): string {
  return randomBytes(16).toString('hex');
}
