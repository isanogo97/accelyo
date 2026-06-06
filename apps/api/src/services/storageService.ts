/**
 * Service de stockage objet (MinIO - S3-compatible).
 * ----------------------------------------------------------------
 * Usage: photos d'identite des etudiants (optionnelles).
 * Les fichiers sont stockes dans le bucket MINIO_BUCKET avec une
 * cle aleatoire (pas le numero etudiant) pour eviter l'enumeration.
 *
 * URLs presigned: validite 5 minutes max - le client doit re-demander
 * une URL pour chaque acces. Eviter les URLs persistantes.
 */

import { Client } from 'minio';
import { getEnv } from '../config/env';

let cached: Client | null = null;

function getClient(): Client {
  if (cached) return cached;
  const env = getEnv();
  cached = new Client({
    endPoint: env.MINIO_ENDPOINT,
    port: env.MINIO_PORT,
    useSSL: env.MINIO_USE_SSL,
    accessKey: env.MINIO_USER,
    secretKey: env.MINIO_PASSWORD,
  });
  return cached;
}

export async function uploadPhoto(
  objectKey: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  const env = getEnv();
  await getClient().putObject(env.MINIO_BUCKET, objectKey, buffer, buffer.length, {
    'Content-Type': contentType,
  });
}

export async function getPresignedUrl(
  objectKey: string,
  expirySeconds = 300,
): Promise<string> {
  const env = getEnv();
  return getClient().presignedGetObject(env.MINIO_BUCKET, objectKey, expirySeconds);
}
