/**
 * Service email (SMTP via nodemailer).
 * ----------------------------------------------------------------
 * Templates supportes:
 *   - Reset password
 *   - Notification nouveau device detecte
 *   - Confirmation de suppression RGPD
 *
 * En dev, sans SMTP configure, on logge simplement le mail au lieu
 * de l'envoyer (pas de crash).
 */

import nodemailer, { type Transporter } from 'nodemailer';
import { getEnv } from '../config/env';
import { logger } from '../utils/logger';

let cached: Transporter | null = null;

function getTransporter(): Transporter {
  if (cached) return cached;
  const env = getEnv();
  cached = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth:
      env.SMTP_USER && env.SMTP_PASSWORD
        ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
        : undefined,
  });
  return cached;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<void> {
  const env = getEnv();
  if (env.NODE_ENV === 'development' && !env.SMTP_USER) {
    logger.info({ ...opts }, '[email-mock] would send');
    return;
  }
  await getTransporter().sendMail({ from: env.SMTP_FROM, ...opts });
}
