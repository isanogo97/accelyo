/**
 * Chiffrement symetrique AES-256-GCM.
 * ----------------------------------------------------------------
 * GCM (Galois/Counter Mode) est utilise car il fournit a la fois:
 *   - La confidentialite (chiffrement)
 *   - L'authenticite (tag d'integrite)
 *
 * Format de sortie: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 *
 * ATTENTION:
 *   - L'IV (Initialization Vector) DOIT etre unique pour chaque chiffrement
 *     avec la meme cle. On le tire au hasard (12 bytes).
 *   - Ne JAMAIS reutiliser la meme paire (cle, IV) - c'est une faille critique.
 *   - La cle DOIT faire EXACTEMENT 32 bytes (256 bits) - 64 caracteres hex.
 *
 * Si vous modifiez le format de sortie, vous casserez TOUTES les donnees
 * deja chiffrees en BDD. Pensez aux migrations.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits - recommande NIST pour GCM
const KEY_LENGTH = 32; // 256 bits

/**
 * Convertit la cle hex (.env) en Buffer 32 bytes.
 * Lance une erreur explicite si la cle est mal configuree -
 * mieux vaut crasher au boot qu'avoir un chiffrement faible.
 */
function loadKey(keyHex: string): Buffer {
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `ENCRYPTION_KEY invalide: attendu ${KEY_LENGTH} bytes (${KEY_LENGTH * 2} hex), recu ${key.length} bytes`,
    );
  }
  return key;
}

/**
 * Chiffre une string utf-8.
 * @param plaintext  Texte clair a chiffrer.
 * @param keyHex     Cle hex (variable d'env ENCRYPTION_KEY).
 * @returns          Format "iv:tag:ciphertext" en hex.
 */
export function encrypt(plaintext: string, keyHex: string): string {
  const key = loadKey(keyHex);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
}

/**
 * Dechiffre un format "iv:tag:ciphertext".
 * Lance une erreur si l'integrite est compromise (tag invalide).
 */
export function decrypt(encrypted: string, keyHex: string): string {
  const parts = encrypted.split(':');
  if (parts.length !== 3) {
    throw new Error('Format chiffre invalide - attendu "iv:tag:ciphertext"');
  }
  const [ivHex, tagHex, ctHex] = parts;
  const key = loadKey(keyHex);
  const iv = Buffer.from(ivHex!, 'hex');
  const authTag = Buffer.from(tagHex!, 'hex');
  const ciphertext = Buffer.from(ctHex!, 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}

/**
 * Helper - chiffre un objet JSON arbitraire (config NFC, secrets MFA, etc.).
 */
export function encryptJSON(obj: unknown, keyHex: string): string {
  return encrypt(JSON.stringify(obj), keyHex);
}

export function decryptJSON<T>(encrypted: string, keyHex: string): T {
  return JSON.parse(decrypt(encrypted, keyHex)) as T;
}
