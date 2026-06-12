/**
 * Service de stockage objet (MinIO - S3-compatible).
 * ----------------------------------------------------------------
 * Usage:
 *   - photos d'identite des etudiants (sensibles, cle aleatoire,
 *     servies uniquement via URL presignee courte).
 *   - images de branding etablissement (logo, fond de carte) -
 *     NON sensibles, cle deterministe, streamees publiquement via
 *     le module /public (voir public.routes.ts).
 *
 * URLs presigned: validite 5 minutes max - le client doit re-demander
 * une URL pour chaque acces. Eviter les URLs persistantes.
 *
 * IMPORTANT: ne JAMAIS exposer MinIO directement. Le branding est
 * re-streame par notre serveur (same-origin) pour que les serveurs
 * Google/Apple Wallet puissent telecharger les images sans URL
 * presignee (qui expirerait).
 */

import { Client } from 'minio';
import type { Readable } from 'stream';
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

/**
 * Recupere un objet MinIO pour le re-streamer au client (branding public).
 * ----------------------------------------------------------------
 * Combine statObject (content-type/taille) + getObject (flux). Si l'objet
 * n'existe pas, MinIO leve une erreur (code 'NotFound'/'NoSuchKey') que
 * l'appelant (route publique) traduit en 404.
 *
 * Retourne le flux lisible, le content-type (defaut octet-stream) et la
 * taille en octets.
 */
export async function getObject(
  objectKey: string,
): Promise<{ stream: Readable; contentType: string; size: number }> {
  const env = getEnv();
  const client = getClient();
  const stat = await client.statObject(env.MINIO_BUCKET, objectKey);
  const stream = await client.getObject(env.MINIO_BUCKET, objectKey);
  const contentType =
    (stat.metaData && (stat.metaData['content-type'] as string)) ||
    'application/octet-stream';
  return { stream, contentType, size: stat.size };
}
