/**
 * Stockage securise (expo-secure-store).
 * ----------------------------------------------------------------
 * Cle => valeur, persistant ENTRE redemarrages.
 * Backed by:
 *   - iOS: Keychain Services (chiffre par le hardware si disponible)
 *   - Android: Keystore (Android Keystore System)
 *
 * NE PAS y mettre AsyncStorage - ce dernier est NON chiffre par defaut
 * et lisible facilement avec un acces physique a l'appareil.
 *
 * Cles utilisees dans Accelyo:
 *   - access_token, refresh_token (tokens API)
 *   - card_token (JWT signe RS256 de la carte)
 *   - device_fingerprint (UUID stable pour le binding)
 */

import * as SecureStore from 'expo-secure-store';

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accelyo_access_token',
  REFRESH_TOKEN: 'accelyo_refresh_token',
  CARD_TOKEN: 'accelyo_card_token',
  DEVICE_FINGERPRINT: 'accelyo_device_fingerprint',
} as const;

export async function saveSecure(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value, {
    requireAuthentication: false, // pas obligatoire pour l'access token
  });
}

export async function readSecure(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key);
}

export async function deleteSecure(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}

/**
 * Lecture protegee par biometrie - pour des cles ultra-sensibles
 * (pas utilise actuellement mais disponible).
 */
export async function readSecureBiometric(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key, { requireAuthentication: true });
}
