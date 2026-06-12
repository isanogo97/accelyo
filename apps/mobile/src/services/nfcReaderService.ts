/**
 * Service de LECTURE NFC (mode lecteur) Accelyo.
 * ----------------------------------------------------------------
 * But: lire l'UID d'une carte etudiante PHYSIQUE existante (parc deja
 * deploye) en approchant la carte du dos du telephone, afin de
 * l'associer au compte etudiant (migration). On lit l'UID du tag
 * (NfcA / IsoDep) via `react-native-nfc-manager` en session lecteur
 * PONCTUELLE, puis on annule la requete technologie dans un `finally`.
 *
 * IMPORTANT - ne pas confondre avec `nfcService.ts` (HCE / emulation):
 *   - nfcService.ts = le telephone EMULE une carte face a un lecteur
 *     Elatec (Host Card Emulation, Android).
 *   - nfcReaderService.ts = le telephone EST le lecteur et lit l'UID
 *     d'une carte physique.
 * Les deux modes ne tournent JAMAIS en meme temps: la lecture est une
 * session courte declenchee par l'utilisateur. Evite de l'appeler
 * pendant qu'une session HCE est armee.
 *
 * iOS: la lecture NFC requiert l'entitlement NFC + NFCReaderUsageDescription
 * (deja present dans app.json). On reste defensif si NFC indisponible.
 */
import NfcManager, { NfcTech, type TagEvent } from 'react-native-nfc-manager';

/** Vrai si l'utilisateur a annule la session NFC (pas une vraie erreur). */
export class NfcCancelledError extends Error {
  constructor() {
    super('Lecture NFC annulee.');
    this.name = 'NfcCancelledError';
  }
}

let started = false;

/** Demarre le module NFC une seule fois (idempotent). */
async function ensureStarted(): Promise<void> {
  if (started) return;
  await NfcManager.start();
  started = true;
}

/**
 * Convertit l'UID d'un tag en hex MAJUSCULES (ex: "04A1B2C3").
 * `react-native-nfc-manager` renvoie `tag.id` soit comme une chaine hex
 * (cas frequent), soit comme un tableau d'octets selon la plateforme /
 * version. On gere les deux pour rester robuste.
 */
export function normalizeUid(id: unknown): string {
  if (Array.isArray(id)) {
    return id
      .map((byte) => (Number(byte) & 0xff).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  }
  if (typeof id === 'string') {
    // Nettoie d'eventuels separateurs (":", "-", espaces) puis MAJUSCULES.
    return id.replace(/[^0-9a-fA-F]/g, '').toUpperCase();
  }
  return '';
}

/** Detecte une annulation utilisateur a partir de l'erreur de la lib. */
function isUserCancellation(e: unknown): boolean {
  const msg = String((e as { message?: string })?.message ?? e ?? '').toLowerCase();
  return (
    msg.includes('cancel') ||
    msg.includes('canceled') ||
    msg.includes('cancelled') ||
    msg.includes('user') ||
    msg.includes('invalidated')
  );
}

/**
 * Demarre une session lecteur, lit l'UID de la carte approchee et le
 * renvoie en hex MAJUSCULES. Annule toujours la requete technologie a la
 * fin (succes comme echec).
 *
 * @throws NfcCancelledError si l'utilisateur annule la session.
 * @throws Error avec un message clair si NFC est desactive / indisponible.
 */
export async function readCardUid(): Promise<string> {
  try {
    await ensureStarted();
  } catch {
    throw new Error("NFC indisponible sur cet appareil.");
  }

  const supported = await NfcManager.isSupported().catch(() => false);
  if (!supported) {
    throw new Error("Le NFC n'est pas disponible sur cet appareil.");
  }

  // Sur Android, NFC peut etre desactive dans les reglages.
  const enabled = await NfcManager.isEnabled().catch(() => true);
  if (!enabled) {
    throw new Error('Active le NFC dans les reglages du telephone, puis reessaie.');
  }

  try {
    // NfcA couvre la plupart des cartes etudiantes (ISO 14443-A);
    // IsoDep en complement pour les cartes a protocole etendu.
    await NfcManager.requestTechnology([NfcTech.NfcA, NfcTech.IsoDep], {
      alertMessage: 'Approche ta carte etudiante du dos du telephone.',
    });

    const tag: TagEvent | null = await NfcManager.getTag();
    const uid = normalizeUid(tag?.id);

    if (!uid) {
      throw new Error("Impossible de lire l'UID de cette carte. Reessaie.");
    }
    return uid;
  } catch (e) {
    if (isUserCancellation(e)) {
      throw new NfcCancelledError();
    }
    throw e instanceof Error ? e : new Error('Echec de la lecture NFC.');
  } finally {
    // Toujours liberer la session lecteur, succes ou echec.
    try {
      await NfcManager.cancelTechnologyRequest();
    } catch {
      // ignore: la session peut deja etre close.
    }
  }
}
