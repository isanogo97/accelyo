/** Tests des tokens JWT access/refresh. */
import jwt from 'jsonwebtoken';
import {
  issueTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
} from '../tokens';
import { Role } from '@accelyo/shared';

const ACCESS = 'a'.repeat(64);
const REFRESH = 'b'.repeat(64);

describe('issueTokenPair', () => {
  it('emet un access verifiable portant role + universityId', () => {
    const pair = issueTokenPair('user-1', Role.UNIVERSITY_ADMIN, 'univ-1', true, ACCESS, REFRESH);
    const decoded = verifyAccessToken(pair.accessToken, ACCESS);
    expect(decoded.sub).toBe('user-1');
    expect(decoded.role).toBe(Role.UNIVERSITY_ADMIN);
    expect(decoded.universityId).toBe('univ-1');
    expect(decoded.mfaVerified).toBe(true);
  });

  it('emet un refresh avec un jti expose pour la revocation', () => {
    const pair = issueTokenPair('user-1', Role.STUDENT, undefined, false, ACCESS, REFRESH);
    const decoded = verifyRefreshToken(pair.refreshToken, REFRESH);
    expect(decoded.jti).toBe(pair.refreshTokenJti);
    expect(decoded.sub).toBe('user-1');
  });

  it('rejette un access signe avec le mauvais secret', () => {
    const pair = issueTokenPair('u', Role.STUDENT, undefined, false, ACCESS, REFRESH);
    expect(() => verifyAccessToken(pair.accessToken, REFRESH)).toThrow();
  });

  it('rejette un access expire', () => {
    const expired = jwt.sign({ sub: 'u', role: Role.STUDENT, mfaVerified: false }, ACCESS, {
      expiresIn: -10,
    });
    expect(() => verifyAccessToken(expired, ACCESS)).toThrow();
  });

  it('separe les domaines: un refresh n est pas un access valide', () => {
    const pair = issueTokenPair('u', Role.STUDENT, undefined, false, ACCESS, REFRESH);
    expect(() => verifyAccessToken(pair.refreshToken, ACCESS)).toThrow();
  });
});
