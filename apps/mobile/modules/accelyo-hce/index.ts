/**
 * API JS du module HCE Accelyo (Android uniquement pour l'instant).
 * iOS: voir docs/APPLE_NFC_SE_ENTITLEMENT_GUIDE.md (NFC & SE Platform, EEE).
 */
import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';

interface AccelyoHceNative {
  isSupported(): boolean;
  setCard(payload: string): void;
  clear(): void;
  isEnabled(): boolean;
}

let native: AccelyoHceNative | null = null;
if (Platform.OS === 'android') {
  try {
    native = requireNativeModule<AccelyoHceNative>('AccelyoHce');
  } catch {
    native = null; // module non lie (avant prebuild / dev-client)
  }
}

/** L'appareil gere-t-il le HCE NFC (Android avec NFC) ? */
export function isHceSupported(): boolean {
  return !!native && native.isSupported();
}

/** Arme la carte: valeur renvoyee au lecteur Elatec au tap (cf. spec, option A = card_uid). */
export function setCard(payload: string): void {
  if (!native) throw new Error('HCE indisponible (Android + module natif requis)');
  native.setCard(payload);
}

/** Desarme la carte (deconnexion / suspension). */
export function clearCard(): void {
  native?.clear();
}

/** Une carte est-elle armee cote natif ? */
export function isHceEnabled(): boolean {
  return !!native && native.isEnabled();
}
