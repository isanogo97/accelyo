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
import * as Crypto from 'expo-crypto';
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
 * SHA-256 native via expo-crypto (fiable sur iOS et Android, contrairement
 * a TextEncoder/crypto.subtle qui ne sont pas garantis en React Native).
 * Renvoie le digest en hexadecimal.
 */
async function sha256(input: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);
}
