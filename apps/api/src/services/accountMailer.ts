/**
 * Envoi des e-mails de compte (mot de passe provisoire).
 * ----------------------------------------------------------------
 * Mutualise par universities (creation d'admin/staff/editeur) et team
 * (gestion d'equipe par l'admin d'etablissement). Best-effort: renvoie
 * true si l'envoi a reussi, false sinon (l'appelant peut alors decider
 * d'exposer le mot de passe en fallback).
 */
import { randomBytes } from 'crypto';
import { hashPassword } from '@accelyo/crypto';
import { getEnv } from '../config/env';
import { sendEmail } from './emailService';

/** Genere un mot de passe provisoire fort (hex + caracteres speciaux). */
export function generateTemporaryPassword(): string {
  return randomBytes(8).toString('hex') + 'A!9';
}

/** Genere + hashe un mot de passe provisoire. */
export async function newTemporaryPassword(): Promise<{
  temporaryPassword: string;
  passwordHash: string;
}> {
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  return { temporaryPassword, passwordHash };
}

/**
 * Envoie le mot de passe provisoire a un compte par e-mail (best-effort).
 * Retourne true si l'envoi a reussi.
 */
export async function emailTempPassword(
  email: string,
  temporaryPassword: string,
): Promise<boolean> {
  const env = getEnv();
  const link = env.DASHBOARD_URL.replace(/\/$/, '') + '/app/login';
  try {
    await sendEmail({
      to: email,
      subject: 'Votre acces Accelyo',
      text:
        'Bonjour,\n\n' +
        'Un compte Accelyo a ete cree pour vous.\n' +
        'Connectez-vous ici : ' + link + '\n' +
        'Email : ' + email + '\n' +
        'Mot de passe provisoire : ' + temporaryPassword + '\n\n' +
        'Pour votre securite, un nouveau mot de passe vous sera demande a la premiere connexion.\n',
    });
    return true;
  } catch {
    return false;
  }
}
