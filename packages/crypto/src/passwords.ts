/**
 * Hash des mots de passe utilisateur via bcrypt.
 * ----------------------------------------------------------------
 * Pourquoi bcrypt ? Lent par design (resistant au brute-force),
 * sel integre au hash, eprouve depuis 1999.
 *
 * INTERDICTIONS ABSOLUES:
 *   - Pas de MD5, SHA1, SHA256 nu pour les mots de passe.
 *   - Pas de stockage en clair, jamais.
 *   - Pas de logs contenant le mot de passe (meme en debug).
 *
 * Cout (rounds): 12 = ~250ms par hash sur un CPU moderne.
 * Augmenter ce nombre tous les 2-3 ans pour suivre la loi de Moore.
 */

import bcrypt from 'bcrypt';

const ROUNDS = 12;

/**
 * Genere un hash bcrypt a stocker en BDD (User.passwordHash).
 */
export async function hashPassword(plaintext: string): Promise<string> {
  if (plaintext.length < 12) {
    throw new Error('Mot de passe trop court (minimum 12 caracteres)');
  }
  return bcrypt.hash(plaintext, ROUNDS);
}

/**
 * Verifie un mot de passe contre son hash.
 * @returns true si OK, false sinon. Ne JAMAIS distinguer "user not found"
 *          et "password incorrect" cote API - c'est une fuite d'info.
 */
export async function verifyPassword(
  plaintext: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
