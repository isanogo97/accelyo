/**
 * Hashs deterministes pour la recherche en BDD.
 * ----------------------------------------------------------------
 * On chiffre les donnees etudiantes (AES-256-GCM) - mais le chiffrement
 * AES n'est PAS deterministe (l'IV change chaque fois). Il est donc
 * impossible de chercher "studentNumberEnc = ..." en BDD.
 *
 * Solution: en plus du champ chiffre, on stocke un HMAC-SHA-256
 * de la valeur. HMAC est deterministe pour une meme cle et une meme
 * entree, donc indexable et utilisable pour les recherches exactes.
 *
 * IMPORTANT:
 *   - HMAC ne supporte PAS les recherches partielles (LIKE %x%).
 *     Pour les recherches plein-texte, prevoir une autre strategie.
 *   - La cle HMAC doit etre DIFFERENTE de la cle AES.
 *     Reutiliser la meme cle est une mauvaise pratique cryptographique.
 *     On derive la cle HMAC depuis ENCRYPTION_KEY avec un sel.
 */

import { createHmac, timingSafeEqual } from 'crypto';

const HMAC_SALT = 'accelyo-search-hash-v1';

/**
 * Derive la cle HMAC a partir de ENCRYPTION_KEY (hex).
 * On utilise un sel constant - pas un vrai KDF, mais suffisant
 * tant que la cle d'origine est aleatoire 256 bits.
 */
function deriveHmacKey(keyHex: string): Buffer {
  return createHmac('sha256', keyHex).update(HMAC_SALT).digest();
}

/**
 * Hash une valeur en HMAC-SHA-256 hex (64 caracteres).
 * On normalise (trim + lowercase) pour que "Foo" et "foo " trouvent la meme entree.
 */
export function hashSearchable(value: string, keyHex: string): string {
  const normalized = value.trim().toLowerCase();
  const hmacKey = deriveHmacKey(keyHex);
  return createHmac('sha256', hmacKey).update(normalized).digest('hex');
}

/**
 * Comparaison en temps constant - evite les timing attacks.
 * A utiliser pour comparer un hash recu avec un hash en base.
 */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
