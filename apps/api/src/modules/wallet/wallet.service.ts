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
import { logger } from '../../utils/logger';

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

/**
 * Met a jour l'etat du passe Google Wallet (revocation/suspension/reactivation).
 * ----------------------------------------------------------------
 * Best-effort: si Google Wallet n'est pas configure, ou si l'appel echoue,
 * on logge un warning et on ne leve JAMAIS d'erreur (l'operation metier
 * sur la carte ne doit pas etre bloquee par Google).
 *
 * state:
 *   - ACTIVE   : passe visible/utilisable (reactivation)
 *   - INACTIVE : passe grise (suspension)
 *   - EXPIRED  : passe expire (revocation definitive)
 */
export async function updateGoogleWalletPassState(
  cardId: string,
  state: 'ACTIVE' | 'INACTIVE' | 'EXPIRED',
): Promise<void> {
  const env = getEnv();
  // Pas configure -> best-effort: on ne fait rien.
  if (!env.GOOGLE_WALLET_ISSUER_ID || !env.GOOGLE_WALLET_KEY_PATH) {
    return;
  }

  try {
    const key = loadServiceAccountKey();
    const issuerId = env.GOOGLE_WALLET_ISSUER_ID as string;
    // Meme convention que buildGoogleWalletSaveUrl.
    const objectId = `${issuerId}.${cardId.replace(/[^\w.-]/g, '_')}`;

    // a) Obtenir un access token OAuth2 via un JWT bearer (RS256).
    const now = Math.floor(Date.now() / 1000);
    const assertion = jwt.sign(
      {
        iss: key.client_email,
        scope: 'https://www.googleapis.com/auth/wallet_object.issuer',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
      },
      key.private_key,
      { algorithm: 'RS256' },
    );

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }).toString(),
    });
    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      throw new Error(`OAuth token HTTP ${tokenRes.status}: ${text}`);
    }
    const tokenJson = (await tokenRes.json()) as { access_token?: string };
    const accessToken = tokenJson.access_token;
    if (!accessToken) {
      throw new Error('access_token absent de la reponse OAuth');
    }

    // b) PATCH de l'objet pour mettre a jour son etat.
    const patchRes = await fetch(
      `https://walletobjects.googleapis.com/walletobjects/v1/genericObject/${objectId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ state }),
      },
    );
    if (!patchRes.ok) {
      const text = await patchRes.text();
      throw new Error(`PATCH genericObject HTTP ${patchRes.status}: ${text}`);
    }
  } catch (err) {
    // Best-effort: on logge mais on ne propage jamais.
    logger.warn(
      { err, cardId, state },
      'Echec mise a jour etat passe Google Wallet (best-effort)',
    );
  }
}
