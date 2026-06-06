/**
 * Signature et verification RSA (RS256) pour les cartes NFC.
 * ----------------------------------------------------------------
 * Pourquoi RSA et pas HMAC ?
 *   - On veut que les lecteurs Elatec puissent verifier la carte
 *     sans connaitre la cle privee. RSA permet la signature
 *     asymetrique: cle privee = serveur uniquement, cle publique
 *     = distribuee aux lecteurs.
 *   - En cas de compromission d'un lecteur, la cle privee reste sure.
 *
 * Generation des cles (a faire UNE FOIS au deploiement):
 *   openssl genrsa -out rsa_private.pem 4096
 *   openssl rsa -in rsa_private.pem -pubout -out rsa_public.pem
 *
 * NE PAS TOUCHER aux cles deployees - changer les cles invalide
 * TOUTES les cartes deja emises. Si rotation necessaire, prevoir
 * une procedure de re-emission massive (jobs/reissueAllCards.ts).
 */

import { createSign, createVerify } from 'crypto';
import type { CardPayload } from '@accelyo/shared';

/**
 * Signe un payload de carte avec la cle privee RSA.
 * Format de sortie: payload base64url + "." + signature base64url
 * (compatible JWT mais on n'utilise pas la lib jsonwebtoken pour
 * eviter une dependance supplementaire ici).
 */
export function signCardPayload(
  payload: CardPayload,
  privateKeyPem: string,
): string {
  const header = { alg: 'RS256', typ: 'JWT' };
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(privateKeyPem);
  const signatureB64 = base64url(signature);

  return `${signingInput}.${signatureB64}`;
}

/**
 * Verifie une carte signee. Renvoie le payload si valide,
 * lance une erreur sinon.
 */
export function verifyCardPayload(
  token: string,
  publicKeyPem: string,
): CardPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Token carte malforme');
  }
  const [headerB64, payloadB64, signatureB64] = parts;
  const signingInput = `${headerB64}.${payloadB64}`;

  const signature = Buffer.from(signatureB64!, 'base64url');
  const verifier = createVerify('RSA-SHA256');
  verifier.update(signingInput);
  verifier.end();

  const valid = verifier.verify(publicKeyPem, signature);
  if (!valid) throw new Error('Signature carte invalide');

  const payload = JSON.parse(
    Buffer.from(payloadB64!, 'base64url').toString('utf8'),
  ) as CardPayload;

  if (payload.expires_at < Math.floor(Date.now() / 1000)) {
    throw new Error('Carte expiree');
  }
  return payload;
}

function base64url(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}
