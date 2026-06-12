/**
 * Service NFC HCE (Host Card Emulation) Accelyo.
 * ----------------------------------------------------------------
 * Android: VRAI HCE via le module natif local `accelyo-hce`
 *   (HostApduService Kotlin). Le telephone repond aux APDU des lecteurs
 *   Elatec (ISO 14443-4) meme app en arriere-plan. Protocole partage:
 *   docs/NFC_HCE_PROTOCOL.md (AID Accelyo, SELECT -> 9000, READ -> card_uid).
 *
 * iOS: badge NFC possible via l'entitlement Apple "NFC & SE Platform"
 *   (EEE, API CardSession) - cf. docs/APPLE_NFC_SE_ENTITLEMENT_GUIDE.md.
 *   En attendant l'entitlement: QR code de fallback (UI).
 *
 * NE PAS changer le format de la reponse APDU sans re-provisionner les
 * lecteurs Elatec, sinon les cartes ne seront plus reconnues.
 */
import { Platform } from 'react-native';
import type { CardPayload } from '@accelyo/shared';
import * as Hce from '../../modules/accelyo-hce';

class AccelyoNfcService {
  private active = false;
  private preparedToken: string | null = null;
  private preparedPayload: CardPayload | null = null;

  /** Le badge NFC natif est-il disponible sur cet appareil (Android + HCE) ? */
  isSupported(): boolean {
    return Platform.OS === 'android' && Hce.isHceSupported();
  }

  /**
   * Arme la carte. Sur Android compatible, active le HCE natif (le tap
   * fonctionne face a un lecteur Elatec). Sinon, la carte reste "armee"
   * cote app (la carte visuelle / QR reste disponible).
   * @param signedToken JWT RS256 signe par l'API.
   * @param payload Payload decode (fournit le card_uid transmis au lecteur).
   */
  async startHCE(signedToken: string, payload: CardPayload): Promise<void> {
    this.preparedToken = signedToken;
    this.preparedPayload = payload;
    this.active = true;
    if (Platform.OS === 'android' && Hce.isHceSupported()) {
      // Option A (cf. spec): on transmet le card_uid; le lecteur valide en ligne.
      Hce.setCard(payload.card_uid);
    }
  }

  async stopHCE(): Promise<void> {
    if (Platform.OS === 'android') {
      try {
        Hce.clearCard();
      } catch {
        // ignore
      }
    }
    this.active = false;
    this.preparedToken = null;
    this.preparedPayload = null;
  }

  isActive(): boolean {
    return this.active;
  }

  /**
   * Reponse preparee (token signe + payload). Utile pour le fallback QR /
   * les ecrans qui ont besoin du card_uid courant.
   */
  getPreparedResponse(): { token: string; payload: CardPayload } | null {
    if (!this.preparedToken || !this.preparedPayload) return null;
    return { token: this.preparedToken, payload: this.preparedPayload };
  }
}

export const nfcService = new AccelyoNfcService();
