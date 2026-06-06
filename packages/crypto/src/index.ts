/**
 * Package @accelyo/crypto
 * ----------------------------------------------------------------
 * Centralise TOUTES les operations cryptographiques du projet.
 *
 * Pourquoi un package separe ?
 *   1. On audite plus facilement le code crypto au meme endroit.
 *   2. On evite les duplications d'implementations entre apps.
 *   3. On peut tester chaque primitive de maniere isolee.
 *
 * REGLE CARDINALE: Aucune operation crypto ne doit etre re-implementee
 * ailleurs dans le monorepo. Si vous avez besoin d'une primitive qui
 * n'existe pas ici, ajoutez-la ici.
 *
 * Algorithmes utilises:
 *   - AES-256-GCM        (chiffrement symetrique des donnees BDD)
 *   - bcrypt             (hash des mots de passe utilisateur)
 *   - HMAC-SHA-256       (hashs deterministe de recherche)
 *   - RS256 (RSA-4096)   (signature des cartes NFC)
 *   - JWT HS256          (tokens d'API access/refresh)
 *   - TOTP (RFC 6238)    (MFA Google Authenticator)
 */

export * from './aes';
export * from './hash';
export * from './passwords';
export * from './tokens';
export * from './rsa';
export * from './totp';
export * from './nonce';
