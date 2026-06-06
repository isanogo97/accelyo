/**
 * Fabrique de tokens pour les roles sans flux de login dedie en test
 * (notamment STUDENT, emis cote mobile via magic link en production).
 */
import { issueTokenPair } from '@accelyo/crypto';
import { Role } from '@accelyo/shared';
import { getEnv } from '../../src/config/env';

export function studentToken(studentId: string, universityId: string): string {
  const env = getEnv();
  const { accessToken } = issueTokenPair(
    studentId,
    Role.STUDENT,
    universityId,
    true,
    env.JWT_SECRET,
    env.JWT_REFRESH_SECRET,
  );
  return accessToken;
}
