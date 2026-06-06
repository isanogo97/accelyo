/**
 * Chargement des cles RSA (signature des cartes).
 * ----------------------------------------------------------------
 * Les cles sont lues UNE FOIS au boot. Si le fichier est absent
 * ou illisible, on crash plutot que de demarrer une API qui
 * ne pourrait emettre aucune carte.
 *
 * Generation des cles (a faire UNE FOIS au deploiement):
 *   openssl genrsa -out rsa_private.pem 4096
 *   openssl rsa -in rsa_private.pem -pubout -out rsa_public.pem
 *
 * NE PAS commiter les fichiers .pem.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getEnv } from './env';

let cached: { privateKey: string; publicKey: string } | null = null;

export function getRsaKeys(): { privateKey: string; publicKey: string } {
  if (cached) return cached;
  const env = getEnv();
  try {
    const privateKey = readFileSync(resolve(env.RSA_PRIVATE_KEY_PATH), 'utf8');
    const publicKey = readFileSync(resolve(env.RSA_PUBLIC_KEY_PATH), 'utf8');
    cached = { privateKey, publicKey };
    return cached;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Impossible de lire les cles RSA. Verifier RSA_PRIVATE_KEY_PATH et RSA_PUBLIC_KEY_PATH. Detail: ${reason}`,
    );
  }
}
