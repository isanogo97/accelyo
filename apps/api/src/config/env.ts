/**
 * Validation des variables d'environnement au boot de l'API.
 * ----------------------------------------------------------------
 * Pourquoi ?
 *   1. Si une variable critique est absente, on CRASH au demarrage
 *      plutot que d'avoir un bug silencieux 3h plus tard en prod.
 *   2. On documente toutes les variables au meme endroit.
 *   3. Le type TypeScript inferre devient la source de verite.
 *
 * Si vous ajoutez une variable d'env: completer aussi .env.example
 * a la racine du projet pour la documentation.
 */

import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'staging', 'production', 'test'])
    .default('development'),
  DEPLOYMENT_MODE: z.enum(['cloud', 'on_premise']).default('cloud'),

  API_PORT: z.coerce.number().int().default(3000),
  API_HOST: z.string().default('0.0.0.0'),
  API_BASE_URL: z.string().url(),

  DATABASE_URL: z.string().min(1),

  REDIS_URL: z.string().min(1),

  // Cles - longueur minimum imposee pour eviter les configurations faibles.
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ENCRYPTION_KEY: z
    .string()
    .length(64, 'ENCRYPTION_KEY doit faire 64 caracteres hex (32 bytes)'),

  RSA_PRIVATE_KEY_PATH: z.string().min(1),
  RSA_PUBLIC_KEY_PATH: z.string().min(1),

  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)),

  // MinIO
  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.coerce.number().int().default(9000),
  MINIO_USE_SSL: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  MINIO_USER: z.string().min(1),
  MINIO_PASSWORD: z.string().min(1),
  MINIO_BUCKET: z.string().default('accelyo-media'),

  // SMTP
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_SECURE: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().default('Accelyo <no-reply@accelyo.fr>'),

  // Adresse qui recoit les notifications du formulaire de contact (vitrine).
  // Si absente, les demandes sont seulement stockees en base (pas d'e-mail).
  CONTACT_NOTIFY_EMAIL: z.string().email().optional(),

  // Izly
  IZLY_MODE: z.enum(['deeplink', 'api_partner']).default('deeplink'),
  IZLY_API_KEY: z.string().optional(),
  IZLY_API_URL: z.string().url().optional(),

  DASHBOARD_URL: z.string().url(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // console.error VOLONTAIRE: ecriture SYNCHRONE avant process.exit().
    console.error('Variables d\'environnement invalides:');
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  cached = parsed.data;
  return cached;
}
