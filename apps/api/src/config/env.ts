/**
 * Validation des variables d'environnement au boot de l'API.
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

  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.coerce.number().int().default(9000),
  MINIO_USE_SSL: z.string().default('false').transform((v) => v === 'true'),
  MINIO_USER: z.string().min(1),
  MINIO_PASSWORD: z.string().min(1),
  MINIO_BUCKET: z.string().default('accelyo-media'),

  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_SECURE: z.string().default('false').transform((v) => v === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().default('Accelyo <no-reply@accelyo.fr>'),

  CONTACT_NOTIFY_EMAIL: z.string().email().optional(),

  // Google Wallet (passes carte etudiante). Optionnels: si absents,
  // l'endpoint /wallet/google renvoie une erreur "non configure".
  GOOGLE_WALLET_ISSUER_ID: z.string().optional(),
  GOOGLE_WALLET_KEY_PATH: z.string().optional(),

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
    console.error('Variables d\'environnement invalides:');
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  cached = parsed.data;
  return cached;
}
