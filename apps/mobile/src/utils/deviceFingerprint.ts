/**
 * Empreinte unique de l'appareil.
 * ----------------------------------------------------------------
 * On veut un identifiant stable QUI NE CHANGE PAS entre redemarrages.
 * On combine plusieurs sources (modele, OS, identifiant Expo) puis
 * on hash pour anonymiser.
 *
 * Si le fingerprint deja stocke est present, on le reutilise -
 * on ne le regenere QUE s'il a ete efface (reinstall, etc.).
 */

import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { saveSecure, readSecure, STORAGE_KEYS } from './keychain';

export async function getOrCreateFingerprint(): Promise<string> {
  const existing = await readSecure(STORAGE_KEYS.DEVICE_FINGERPRINT);
  if (existing) return existing;

  // Sources combinees - assez stable mais non-trivial a forger.
  const seed = [
    Device.modelId ?? 'unknown',
    Device.osName ?? 'unknown',
    Device.osVersion ?? 'unknown',
    Constants.installationId ?? 'unknown',
    Date.now().toString(36),
  ].join('|');

  // Simple hash hex (non-crypto, mais l'objectif est l'unicite + opacite).
  const fp = await sha256(seed);
  await saveSecure(STORAGE_KEYS.DEVICE_FINGERPRINT, fp);
  return fp;
}

/**
 * Implementation SHA-256 a base de Web Crypto si dispo, fallback simple sinon.
 * En React Native >= 0.71, on peut utiliser crypto subtle via polyfill.
 */
async function sha256(input: string): Promise<string> {
  // ATTENTION: utilisation de Crypto.digestStringAsync recommandee si dispo.
  // Implementation minimale ici - a renforcer en prod avec expo-crypto.
  const buf = new TextEncoder().encode(input);
  const hash = await (globalThis.crypto as unknown as {
    subtle?: { digest: (a: string, b: ArrayBuffer) => Promise<ArrayBuffer> };
  }).subtle?.digest('SHA-256', buf.buffer);
  if (!hash) {
    return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
