/**
 * Generation des passes Google Wallet (carte etudiante).
 * ----------------------------------------------------------------
 * On signe un JWT "save to wallet" (RS256) avec la cle du compte de
 * service Google. Le lien https://pay.google.com/gp/v/save/<jwt>
 * ajoute la carte dans Google Wallet en un clic.
 *
 * La classe (genericClasses) est incluse inline: elle est creee a la
 * premiere sauvegarde si elle n'existe pas (mode demo).
 *
 * NFC Smart Tap: a activer plus tard (enableSmartTap + redemptionIssuers
 * + enrolement du collector ID des lecteurs Elatec aupres de Google).
 */
import { readFileSync } from 'fs';
import jwt from 'jsonwebtoken';
import { decrypt } from '@accelyo/crypto';
import { prisma } from '../../config/database';
import { getEnv } from '../../config/env';
import { NotFoundError, BadRequestError } from '../../utils/errors';

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}

let cachedKey: ServiceAccountKey | null = null;

function loadServiceAccountKey(): ServiceAccountKey {
  if (cachedKey) return cachedKey;
  const env = getEnv();
  if (!env.GOOGLE_WALLET_ISSUER_ID || !env.GOOGLE_WALLET_KEY_PATH) {
    throw new BadRequestError(
      'Google Wallet non configure (GOOGLE_WALLET_ISSUER_ID / GOOGLE_WALLET_KEY_PATH manquants)',
    );
  }
  const raw = readFileSync(env.GOOGLE_WALLET_KEY_PATH, 'utf8');
  const parsed = JSON.parse(raw) as ServiceAccountKey;
  if (!parsed.client_email || !parsed.private_key) {
    throw new BadRequestError('Cle de compte de service Google invalide');
  }
  cachedKey = { client_email: parsed.client_email, private_key: parsed.private_key };
  return cachedKey;
}

export async function buildGoogleWalletSaveUrl(studentId: string): Promise<string> {
  const env = getEnv();
  const key = loadServiceAccountKey();
  const issuerId = env.GOOGLE_WALLET_ISSUER_ID as string;

  // Une carte par etudiant (Card.studentId est unique).
  const card = await prisma.card.findUnique({
    where: { studentId },
    include: { student: { include: { university: true } } },
  });
  if (!card) throw new NotFoundError('Aucune carte pour cet etudiant');

  const firstName = decrypt(card.student.firstNameEnc, env.ENCRYPTION_KEY);
  const lastName = decrypt(card.student.lastNameEnc, env.ENCRYPTION_KEY);
  const studentNumber = decrypt(
    card.student.studentNumberEnc,
    env.ENCRYPTION_KEY,
  );
  const universityName = card.student.university.name;

  const classId = `${issuerId}.accelyo_student`;
  // Les ids d'objets doivent etre alphanumeriques (., _, -) cote Google.
  const objectId = `${issuerId}.${card.id.replace(/[^\w.-]/g, '_')}`;

  const genericClass = {
    id: classId,
    classTemplateInfo: {
      cardTemplateOverride: {
        cardRowTemplateInfos: [
          {
            oneItem: {
              item: {
                firstValue: {
                  fields: [
                    { fieldPath: "object.textModulesData['student_number']" },
                  ],
                },
              },
            },
          },
        ],
      },
    },
  };

  const genericObject = {
    id: objectId,
    classId,
    state: 'ACTIVE',
    cardTitle: {
      defaultValue: { language: 'fr', value: universityName },
    },
    subheader: {
      defaultValue: { language: 'fr', value: 'Carte etudiante' },
    },
    header: {
      defaultValue: { language: 'fr', value: `${firstName} ${lastName}` },
    },
    hexBackgroundColor: '#1d4ed8',
    logo: {
      sourceUri: { uri: 'https://accelyo.fr/assets/logo.svg' },
      contentDescription: {
        defaultValue: { language: 'fr', value: 'Accelyo' },
      },
    },
    textModulesData: [
      {
        id: 'student_number',
        header: 'Numero etudiant',
        body: studentNumber,
      },
      { id: 'status', header: 'Statut', body: 'Etudiant' },
    ],
    barcode: {
      type: 'QR_CODE',
      value: card.cardUid,
      alternateText: studentNumber,
    },
  };

  const claims = {
    iss: key.client_email,
    aud: 'google',
    typ: 'savetowallet',
    origins: ['https://accelyo.fr'],
    payload: {
      genericClasses: [genericClass],
      genericObjects: [genericObject],
    },
  };

  const token = jwt.sign(claims, key.private_key, { algorithm: 'RS256' });
  return `https://pay.google.com/gp/v/save/${token}`;
}
