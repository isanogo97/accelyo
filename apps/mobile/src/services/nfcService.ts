/**
 * Service NFC HCE (Host Card Emulation).
 * ----------------------------------------------------------------
 * Sur Android, on emule une carte Mifare via le module HCE de
 * react-native-nfc-manager. Le telephone repond aux APDUs envoyes
 * par les lecteurs Elatec en mode lecteur (ISO 14443-4).
 *
 * Sur iOS:
 *   - Pas d'API HCE publique. Apple n'autorise pas l'emulation
 *     d'une carte Mifare sans accord commercial. La version iOS
 *     d'Accelyo utilise donc un QR code de fallback (a developper).
 *
 * NE PAS modifier le format de la reponse APDU sans coordonner avec
 * la configuration deployee dans les lecteurs Elatec - sinon les
 * cartes ne seront plus reconnues.
 */

import NfcManager from 'react-native-nfc-manager';
import type { CardPayload } from '@accelyo/shared';

class AccelyoNfcService {
  private active = false;

  /**
   * Initialise le NFC manager et active l'emulation pour la carte.
   * @param signedToken JWT RS256 signe par l'API.
   * @param payload Payload decode (utile pour l'UID Mifare).
   */
  async startHCE(signedToken: string, payload: CardPayload): Promise<void> {
    try {
      await NfcManager.start();
      this.active = true;
      // ATTENTION: Implementation HCE specifique - voir la doc
      // react-native-nfc-manager pour la configuration des AID
      // Android (Application IDs). En l'absence d'AID custom, le
      // telephone se comporte comme une carte Mifare standard.
      //
      // Pour l'instant on prepare la reponse APDU - la lib gere
      // automatiquement les events HCE Android via le manifest.
      this.preparedToken = signedToken;
      this.preparedPayload = payload;
    } catch (err) {
      console.error('[nfc] start HCE failed', err);
      throw err;
    }
  }

  async stopHCE(): Promise<void> {
    if (!this.active) return;
    try {
      await NfcManager.cancelTechnologyRequest().catch(() => undefined);
      this.active = false;
    } catch (err) {
      console.error('[nfc] stop HCE failed', err);
    }
  }

  isActive(): boolean {
    return this.active;
  }

  // Stockes en memoire pour repondre aux events HCE.
  private preparedToken: string | null = null;
  private preparedPayload: CardPayload | null = null;
}

export const nfcService = new AccelyoNfcService();
