/**
 * Generation des passes Apple Wallet (.pkpass) - carte etudiante.
 * ----------------------------------------------------------------
 * Miroir de l'integration Google Wallet. Le .pkpass est genere
 * LOCALEMENT (aucun appel reseau sortant) puis telecharge par
 * l'etudiant sur SON appareil (opt-in). Pas de fuite de donnees.
 *
 * Structure d'un .pkpass (archive ZIP):
 *   - pass.json        : description du passe (storeCard)
 *   - icon.png / @2x   : icone (obligatoire cote Apple)
 *   - logo.png         : logo
 *   - manifest.json    : { fichier: sha1hex } pour chaque fichier
 *   - signature        : PKCS#7 detache (DER) du manifest, signe avec
 *                        le certificat Pass Type ID du client.
 *
 * Le certificat (cert PEM + cle PEM + WWDR PEM) est fourni par le
 * client via son compte Apple Developer. Tant qu'il n'est pas
 * configure, isAppleWalletConfigured() renvoie false et l'endpoint
 * repond 503 (voir student-auth.controller).
 *
 * Signature: deleguee a `openssl smime` (present dans l'image Alpine
 * de prod), via execFileSync (pas de shell) -> aucune dependance npm.
 *
 * Note icones: nous n'avons pas d'assets binaires fiables a injecter
 * ici, donc une icone PNG opaque minimale (29x29, couleur de marque
 * neutre) est embarquee en dur ci-dessous et reutilisee pour
 * icon.png / icon@2x.png / logo.png. Cela suffit a la validation
 * Apple; le client pourra remplacer ces images plus tard.
 */
import { createHash } from 'crypto';
import { execFileSync } from 'child_process';
import { existsSync, mkdtempSync, writeFileSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { decrypt } from '@accelyo/crypto';
import { prisma } from '../../config/database';
import { getEnv } from '../../config/env';
import { NotFoundError, BadRequestError } from '../../utils/errors';
import { createZip } from './pkpass-zip';

// Icone PNG 29x29 opaque (couleur Accelyo #2563eb), generee hors-ligne.
// Sert d'icon.png / icon@2x.png / logo.png par defaut.
const DEFAULT_ICON_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAB0AAAAdCAIAAADZ8fBYAAAAJklEQVR42mNQTX5NC8Qwau6ouaPm' +
  'jpo7au6ouaPmjpo7au6ouaPmjpo7au6gMhcAzy3DCH4JG/8AAAAASUVORK5CYII=';

const DEFAULT_ICON_PNG = Buffer.from(DEFAULT_ICON_PNG_BASE64, 'base64');

/**
 * Vrai si Apple Wallet est utilisable: identifiants presents ET
 * fichiers cert/cle/WWDR existants sur disque.
 */
export function isAppleWalletConfigured(): boolean {
  const env = getEnv();
  if (!env.APPLE_WALLET_PASS_TYPE_ID || !env.APPLE_WALLET_TEAM_ID) {
    return false;
  }
  return (
    existsSync(env.APPLE_WALLET_CERT_PATH) &&
    existsSync(env.APPLE_WALLET_KEY_PATH) &&
    existsSync(env.APPLE_WALLET_WWDR_PATH)
  );
}

/** Convertit un hex CSS (#rrggbb ou #rgb) en chaine `rgb(r, g, b)`. */
function hexToRgb(hex: string): string {
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) {
    // Fallback bleu Accelyo si la couleur est invalide.
    return 'rgb(37, 99, 235)';
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

function sha1hex(buf: Buffer): string {
  return createHash('sha1').update(buf).digest('hex');
}

interface PassField {
  key: string;
  label?: string;
  value: string;
}

/**
 * Signe le manifest via `openssl smime` (PKCS#7 detache, sortie DER).
 * Ecrit les fichiers temporaires dans os.tmpdir() et les nettoie.
 * Synchrone: execFileSync (pas de shell) -> pas d'injection possible.
 */
function signManifest(manifest: Buffer): Buffer {
  const env = getEnv();
  const dir = mkdtempSync(join(tmpdir(), 'pkpass-'));
  const manifestPath = join(dir, 'manifest.json');
  const sigPath = join(dir, 'signature');

  try {
    writeFileSync(manifestPath, manifest);

    const args = [
      'smime',
      '-binary',
      '-sign',
      '-certfile',
      env.APPLE_WALLET_WWDR_PATH,
      '-signer',
      env.APPLE_WALLET_CERT_PATH,
      '-inkey',
      env.APPLE_WALLET_KEY_PATH,
      '-in',
      manifestPath,
      '-out',
      sigPath,
      '-outform',
      'DER',
    ];
    if (env.APPLE_WALLET_KEY_PASSPHRASE) {
      args.push('-passin', `pass:${env.APPLE_WALLET_KEY_PASSPHRASE}`);
    }

    try {
      execFileSync('openssl', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    } catch (err: unknown) {
      const stderr =
        err && typeof err === 'object' && 'stderr' in err
          ? String((err as { stderr?: Buffer }).stderr ?? '')
          : '';
      throw new BadRequestError(
        `Echec de la signature du passe Apple Wallet${stderr ? `: ${stderr}` : ''}`,
      );
    }

    if (!existsSync(sigPath)) {
      throw new BadRequestError(
        'Signature Apple Wallet introuvable apres openssl',
      );
    }
    return readFileSync(sigPath);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Construit le .pkpass complet pour un etudiant et renvoie le Buffer.
 */
export async function buildApplePkpass(studentId: string): Promise<Buffer> {
  const env = getEnv();

  if (!env.APPLE_WALLET_PASS_TYPE_ID || !env.APPLE_WALLET_TEAM_ID) {
    throw new BadRequestError('Apple Wallet non configure');
  }

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
  const brandColor = card.student.university.brandColor;

  const secondaryFields: PassField[] = [
    { key: 'student', label: 'N° etudiant', value: studentNumber },
    { key: 'estab', label: 'Etablissement', value: universityName },
  ];

  const auxiliaryFields: PassField[] = [];
  if (card.expiresAt) {
    auxiliaryFields.push({
      key: 'expires',
      label: 'Expiration',
      value: card.expiresAt.toISOString().slice(0, 10),
    });
  }

  const pass = {
    formatVersion: 1,
    passTypeIdentifier: env.APPLE_WALLET_PASS_TYPE_ID,
    teamIdentifier: env.APPLE_WALLET_TEAM_ID,
    organizationName: universityName,
    description: 'Carte etudiante Accelyo',
    serialNumber: card.cardUid,
    backgroundColor: hexToRgb(brandColor),
    foregroundColor: 'rgb(255, 255, 255)',
    labelColor: 'rgb(255, 255, 255)',
    storeCard: {
      primaryFields: [
        { key: 'name', label: 'Etudiant', value: `${firstName} ${lastName}` },
      ],
      secondaryFields,
      auxiliaryFields,
    },
    barcodes: [
      {
        format: 'PKBARCODE_FORMAT_QR',
        message: card.cardUid,
        messageEncoding: 'iso-8859-1',
      },
    ],
  };

  const passJson = Buffer.from(JSON.stringify(pass), 'utf8');

  // Fichiers du passe (hors manifest/signature).
  const contentFiles: { name: string; data: Buffer }[] = [
    { name: 'pass.json', data: passJson },
    { name: 'icon.png', data: DEFAULT_ICON_PNG },
    { name: 'icon@2x.png', data: DEFAULT_ICON_PNG },
    { name: 'logo.png', data: DEFAULT_ICON_PNG },
  ];

  // manifest.json = { fichier: sha1hex }.
  const manifest: Record<string, string> = {};
  for (const f of contentFiles) {
    manifest[f.name] = sha1hex(f.data);
  }
  const manifestJson = Buffer.from(JSON.stringify(manifest), 'utf8');

  // Signature PKCS#7 detachee du manifest.
  const signature = signManifest(manifestJson);

  return createZip([
    ...contentFiles,
    { name: 'manifest.json', data: manifestJson },
    { name: 'signature', data: signature },
  ]);
}
