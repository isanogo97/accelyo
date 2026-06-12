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
 * NFC Smart Tap: implemente ici, mais ACTIF UNIQUEMENT si
 * GOOGLE_WALLET_SMART_TAP_ISSUER_ID est defini (le collector / redemption
 * issuer ID fourni par Google apres enrolement au programme Smart Tap) ET
 * que le lecteur (Elatec) est configure en mode Smart Tap/VAS. Sinon le
 * passe reste un passe visuel normal. Voir WALLET_NFC_BADGING.md.
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
  // Smart Tap (badgeage NFC): actif uniquement si l'emetteur est enrole
  // Smart Tap chez Google ET que le lecteur (Elatec) est configure en mode
  // Smart Tap/VAS. Tant que cet ID est absent -> passe visuel normal.
  const smartTapIssuerId = env.GOOGLE_WALLET_SMART_TAP_ISSUER_ID;
  const smartTapEnabled = Boolean(smartTapIssuerId);

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
  const university = card.student.university;
  // Couleur de marque de l'etablissement (fallback bleu si invalide).
  const brandColor =
    typeof university.brandColor === 'string' &&
    /^#[0-9a-fA-F]{6}$/.test(university.brandColor.trim())
      ? university.brandColor.trim()
      : '#1d4ed8';
  // Google Wallet ne supporte PAS le SVG: on n'inclut le logo /
  // heroImage que si c'est une URL http(s) raster. Notre endpoint
  // public (.../logo, .../card-bg) sert bien des images uploadees raster.
  const isRasterHttp = (u: string | null): u is string =>
    typeof u === 'string' &&
    /^https?:\/\//i.test(u) &&
    !/\.svg(\?|$)/i.test(u);
  const logoUri = isRasterHttp(university.logoUrl) ? university.logoUrl : null;
  const heroUri = isRasterHttp(university.cardBackgroundUrl)
    ? university.cardBackgroundUrl
    : null;

  const classId = `${issuerId}.accelyo_student`;
  // Les ids d'objets doivent etre alphanumeriques (., _, -) cote Google.
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

  // Smart Tap au niveau de la classe: active la lecture NFC du passe par
  // un lecteur Smart Tap et declare le(s) collector(s)/redemption issuer(s)
  // autorise(s). N'est ajoute que si l'emetteur est enrole Smart Tap.
  if (smartTapEnabled) {
    genericClass.enableSmartTap = true;
    genericClass.redemptionIssuers = [smartTapIssuerId];
  }

  const genericObject: Record<string, unknown> = {
    id: objectId,
    classId,
    state: 'ACTIVE',
    // Titre = nom de l'etablissement (la carte ressemble a SA carte).
    cardTitle: {
      defaultValue: { language: 'fr', value: universityName },
    },
    subheader: {
      defaultValue: { language: 'fr', value: 'Carte etudiante' },
    },
    header: {
      defaultValue: { language: 'fr', value: `${firstName} ${lastName}` },
    },
    // Couleur de l'etablissement (et non plus un bleu code en dur).
    hexBackgroundColor: brandColor,
    textModulesData: [
      {
        id: 'student_number',
        header: 'Numero etudiant',
        body: studentNumber,
      },
      { id: 'status', header: 'Statut', body: 'Etudiant' },
    ],
    // QR conserve (cardUid). PAS de photo etudiant (donnee perso).
    barcode: {
      type: 'QR_CODE',
      value: card.cardUid,
      alternateText: studentNumber,
    },
  };

  // Logo de l'etablissement (uniquement si raster http(s) - pas de SVG).
  if (logoUri) {
    genericObject.logo = {
      sourceUri: { uri: logoUri },
      contentDescription: {
        defaultValue: { language: 'fr', value: universityName },
      },
    };
  }
  // Visuel de fond de carte en heroImage si disponible.
  if (heroUri) {
    genericObject.heroImage = {
      sourceUri: { uri: heroUri },
      contentDescription: {
        defaultValue: { language: 'fr', value: 'Carte etudiante' },
      },
    };
  }

  // Valeur transmise via NFC Smart Tap au lecteur: on reutilise le cardUid
  // (coherent avec le QR / le flux HCE existant). Le backend la validera
  // exactement comme la valeur lue via QR ou HCE. N'est ajoute que si Smart
  // Tap est actif (sinon passe visuel normal, zero regression).
  if (smartTapEnabled) {
    genericObject.smartTapRedemptionValue = card.cardUid;
  }

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
