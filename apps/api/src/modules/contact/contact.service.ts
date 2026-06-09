/**
 * Logique metier des demandes de contact (formulaire du site vitrine).
 * Stocke toujours en base; envoie une notification e-mail si configure.
 */
import type { Request } from 'express';
import { prisma } from '../../config/database';
import { getEnv } from '../../config/env';
import { sendEmail } from '../../services/emailService';
import { logger } from '../../utils/logger';

export interface ContactInputData {
  name: string;
  email: string;
  organization?: string;
  message: string;
}

export async function createContactRequest(
  req: Request,
  input: ContactInputData,
): Promise<{ id: string }> {
  const org = input.organization?.trim() || null;
  const saved = await prisma.contactRequest.create({
    data: {
      name: input.name,
      email: input.email,
      organization: org,
      message: input.message,
      ipAddress: req.ip ?? null,
    },
  });

  // Notification e-mail best-effort: ne bloque jamais la reponse au visiteur.
  const env = getEnv();
  if (env.CONTACT_NOTIFY_EMAIL) {
    try {
      await sendEmail({
        to: env.CONTACT_NOTIFY_EMAIL,
        subject: `[Accelyo] Demande de contact - ${input.name}`,
        text:
          'Nouvelle demande depuis le site vitrine.\n\n' +
          `Nom: ${input.name}\n` +
          `Email: ${input.email}\n` +
          `Organisation: ${org ?? '-'}\n\n` +
          `Message:\n${input.message}\n`,
      });
    } catch (e) {
      logger.warn(
        { err: (e as Error).message, id: saved.id },
        'contact notify email failed',
      );
    }
  }
  return { id: saved.id };
}

export async function listContactRequests() {
  return prisma.contactRequest.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
}

export async function markContactHandled(id: string, handled: boolean) {
  return prisma.contactRequest.update({
    where: { id },
    data: { handled },
  });
}
