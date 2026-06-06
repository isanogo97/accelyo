/**
 * Validation des requetes provenant des lecteurs Elatec.
 */
import { z } from 'zod';

export const validateNfcSchema = z.object({
  reader_id: z.string().min(1).max(100),
  reader_location: z.string().min(1).max(200),
  card_uid: z.string().regex(/^[0-9A-Fa-f]{8,16}$/),
  /** Timestamp UNIX en millisecondes. */
  timestamp: z.number().int().positive(),
  /** Nonce hex - 32 caracteres (16 bytes). */
  nonce: z.string().regex(/^[0-9a-f]{32}$/),
  /** Signature HMAC-SHA-256 hex - 64 caracteres. */
  signature: z.string().regex(/^[0-9a-f]{64}$/),
});
export type ValidateNfcInput = z.infer<typeof validateNfcSchema>;

export const registerReaderSchema = z.object({
  reader_id: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
  location: z.string().min(1).max(200),
});
export type RegisterReaderInput = z.infer<typeof registerReaderSchema>;
