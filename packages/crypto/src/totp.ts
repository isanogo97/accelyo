/**
 * MFA via TOTP (Time-based One-Time Password, RFC 6238).
 * ----------------------------------------------------------------
 * Compatible Google Authenticator, Authy, 1Password, etc.
 *
 * Flux:
 *   1. L'utilisateur active la MFA -> on genere un secret aleatoire.
 *   2. Le secret est CHIFFRE (AES) avant d'etre stocke en BDD.
 *   3. On affiche le QR code (otpauth://...) -> scan dans l'app authenticator.
 *   4. A chaque login, l'utilisateur entre le code a 6 chiffres.
 *
 * Window de tolerance: +/- 1 step (30s) pour gerer les decalages d'horloge.
 *
 * ATTENTION:
 *   - Le secret est sensible - ne JAMAIS le logger.
 *   - Generer aussi des codes de secours (backup codes) chiffres en BDD.
 */

import { authenticator } from 'otplib';

authenticator.options = {
  step: 30,
  window: 1,
};

/** Genere un nouveau secret base32 (a chiffrer avant stockage). */
export function generateMfaSecret(): string {
  return authenticator.generateSecret();
}

/**
 * Cree l'URI otpauth:// pour generer un QR code.
 * @param userEmail Email affiche dans l'app authenticator.
 */
export function buildOtpAuthUrl(userEmail: string, secret: string): string {
  return authenticator.keyuri(userEmail, 'Accelyo', secret);
}

/** Verifie un code a 6 chiffres - true si correct. */
export function verifyMfaCode(code: string, secret: string): boolean {
  return authenticator.verify({ token: code, secret });
}
