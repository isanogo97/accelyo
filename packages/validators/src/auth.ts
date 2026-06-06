/**
 * Validation des endpoints d'authentification.
 */
import { z } from 'zod';
import { emailSchema, passwordSchema } from './common';

export const loginSchema = z.object({
  email: emailSchema,
  /**
   * Pour le login on accepte tout string non vide.
   * On ne re-applique PAS passwordSchema ici - cela permet
   * aux mots de passe legacy (changement de regles) de fonctionner.
   */
  password: z.string().min(1).max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Code TOTP a 6 chiffres. */
export const mfaVerifySchema = z.object({
  /**
   * Token temporaire emis par /auth/login lorsque MFA est requise.
   * Different de l'access token final.
   */
  challengeToken: z.string().min(10),
  code: z.string().regex(/^\d{6}$/, 'Code TOTP invalide (6 chiffres)'),
});
export type MfaVerifyInput = z.infer<typeof mfaVerifySchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(20),
});
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20),
  newPassword: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
