/**
 * Generation des passes Google Wallet (carte etudiante).
 * ----------------------------------------------------------------
 * On signe un JWT "save to wallet" (RS256) avec la cle du compte de
 * service Google. Le lien https://pay.google.com/gp/v/save/<jwt>
 * ajoute la carte dans Google Wallet en un clic.
 *
 * IMPORTANT - rafraichissement de l'apparence: Google ne met PAS a jour
 * l'apparence d'un objet deja existant via le JWT "save". On PATCH donc
 * l'objet (best-effort) a chaque construction du lien, pour que la couleur
 * de marque / le logo / le visuel de l'etablissement soient toujours a jour
 * sur le passe (sinon il reste fige sur sa premiere version, bleu par defaut).
 *
 * NFC Smart Tap: ACTIF UNIQUEMENT si GOOGLE_WALLET_SMART_TAP_ISSUER_ID est
 * defini ET que le lecteur (Elatec) est configure en mode Smart Tap/VAS.
 * Voir WALLET_NFC_BADGING.md.
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

/** Access token OAuth2 (JWT bearer RS256) pour l'API Wallet Objects. */
async function getWalletAccessToken(key: ServiceAccountKey): Promise<string> {
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
  if (!tokenJson.access_token) {
    throw new Error('access_token absent de la reponse OAuth');
  }
  return tokenJson.access_token;
}

/**
 * Met a jour (best-effort) l'apparence d'un objet Google Wallet existant.
 * PATCH partiel SANS `state` (pour ne pas reactiver un passe suspendu/revoque).
 * 404 = objet pas encore cree -> ignore (le JWT "save" le creera).
 */
async function patchWalletObjectAppearance(
  objectId: string,
  appearance: Record<string, unknown>,
): Promise<void> {
  const env = getEnv();
  if (!env.GOOGLE_WALLET_ISSUER_ID || !env.GOOGLE_WALLET_KEY_PATH) return;
  try {
    const key = loadServiceAccountKey();
    const accessToken = await getWalletAccessToken(key);
    const res = await fetch(
      `https://walletobjects.googleapis.com/walletobjects/v1/genericObject/${objectId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appearance),
      },
    );
    if (!res.ok && res.status !== 404) {
      const text = await res.text();
      throw new Error(`PATCH apparence HTTP ${res.status}: ${text}`);
    }
  } catch (err) {
    logger.warn(
      { err, objectId },
      'Echec rafraichissement apparence passe Google Wallet (best-effort)',
    );
  }
}

export async function buildGoogleWalletSaveUrl(studentId: string): Promise<string> {
  const env = getEnv();
  const key = loadServiceAccountKey();
  const issuerId = env.GOOGLE_WALLET_ISSUER_ID as string;
  const smartTapIssuerId = env.GOOGLE_WALLET_SMART_TAP_ISSUER_ID;
  const smartTapEnabled = Boolean(smartTapIssuerId);

  const card = await prisma.card.findUnique({
    where: { studentId },
    include: { student: { include: { university: true } } },
  });
  if (!card) throw new NotFoundError('Aucune carte pour cet etudiant');

  const firstName = decrypt(card.student.firstNameEnc, env.ENCRYPTION_KEY);
  const lastName = decrypt(card.student.lastNameEnc, env.ENCRYPTION_KEY);
  const studentNumber = decrypt(card.student.studentNumberEnc, env.ENCRYPTION_KEY);
  const universityName = card.student.university.name;
  const university = card.student.university;

  const brandColor =
    typeof university.brandColor === 'string' &&
    /^#[0-9a-fA-F]{6}$/.test(university.brandColor.trim())
      ? university.brandColor.trim()
      : '#1d4ed8';

  const isRasterHttp = (u: string | null): u is string =>
    typeof u === 'string' &&
    /^https?:\/\//i.test(u) &&
    !/\.svg(\?|$)/i.test(u);
  const logoUri = isRasterHttp(university.logoUrl) ? university.logoUrl : null;
  const heroUri = isRasterHttp(university.cardBackgroundUrl)
    ? university.cardBackgroundUrl
    : null;

  const classId = `${issuerId}.accelyo_student`;
  const objectId = `${issuerId}.${card.id.replace(/[^\w.-]/g, '_')}`;

  const genericClass: Record<string, unknown> = {
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
  if (smartTapEnabled) {
    genericClass.enableSmartTap = true;
    genericClass.redemptionIssuers = [smartTapIssuerId];
  }

  // Apparence (partagee entre le JWT "save" et le PATCH de refresh).
  const appearance: Record<string, unknown> = {
    cardTitle: { defaultValue: { language: 'fr', value: universityName } },
    subheader: { defaultValue: { language: 'fr', value: 'Carte etudiante' } },
    header: {
      defaultValue: { language: 'fr', value: `${firstName} ${lastName}` },
    },
    hexBackgroundColor: brandColor,
    textModulesData: [
      { id: 'student_number', header: 'Numero etudiant', body: studentNumber },
      { id: 'status', header: 'Statut', body: 'Etudiant' },
    ],
    barcode: {
      type: 'QR_CODE',
      value: card.cardUid,
      alternateText: studentNumber,
    },
  };
  if (logoUri) {
    appearance.logo = {
      sourceUri: { uri: logoUri },
      contentDescription: {
        defaultValue: { language: 'fr', value: universityName },
      },
    };
  }
  if (heroUri) {
    appearance.heroImage = {
      sourceUri: { uri: heroUri },
      contentDescription: {
        defaultValue: { language: 'fr', value: 'Carte etudiante' },
      },
    };
  }

  const genericObject: Record<string, unknown> = {
    id: objectId,
    classId,
    state: 'ACTIVE',
    ...appearance,
  };
  if (smartTapEnabled) {
    genericObject.smartTapRedemptionValue = card.cardUid;
    appearance.smartTapRedemptionValue = card.cardUid;
  }

  // Rafraichit l'apparence du passe s'il existe deja (Google ne le fait pas
  // via le JWT "save"). Best-effort: ne bloque jamais la generation du lien.
  await patchWalletObjectAppearance(objectId, appearance);

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
 * Best-effort: ne leve JAMAIS d'erreur (l'operation metier ne doit pas etre
 * bloquee par Google).
 *   - ACTIVE   : passe utilisable (reactivation)
 *   - INACTIVE : passe grise (suspension)
 *   - EXPIRED  : passe expire (revocation)
 */
export async function updateGoogleWalletPassState(
  cardId: string,
  state: 'ACTIVE' | 'INACTIVE' | 'EXPIRED',
): Promise<void> {
  const env = getEnv();
  if (!env.GOOGLE_WALLET_ISSUER_ID || !env.GOOGLE_WALLET_KEY_PATH) return;
  try {
    const key = loadServiceAccountKey();
    const issuerId = env.GOOGLE_WALLET_ISSUER_ID as string;
    const objectId = `${issuerId}.${cardId.replace(/[^\w.-]/g, '_')}`;
    const accessToken = await getWalletAccessToken(key);
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
    logger.warn(
      { err, cardId, state },
      'Echec mise a jour etat passe Google Wallet (best-effort)',
    );
  }
}
