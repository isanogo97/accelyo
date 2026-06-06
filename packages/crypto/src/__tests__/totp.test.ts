/** Tests MFA TOTP (RFC 6238). */
import { authenticator } from 'otplib';
import { generateMfaSecret, buildOtpAuthUrl, verifyMfaCode } from '../totp';

describe('totp', () => {
  it('genere un secret base32 non vide', () => {
    const secret = generateMfaSecret();
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(secret.length).toBeGreaterThanOrEqual(16);
  });

  it('construit une URI otpauth scannable', () => {
    const secret = generateMfaSecret();
    const uri = buildOtpAuthUrl('admin@accelyo.fr', secret);
    expect(uri).toContain('otpauth://totp/');
    expect(uri).toContain('Accelyo');
    expect(uri).toContain(`secret=${secret}`);
  });

  it('valide le code courant et rejette un code faux', () => {
    const secret = generateMfaSecret();
    const code = authenticator.generate(secret);
    expect(verifyMfaCode(code, secret)).toBe(true);
    expect(verifyMfaCode('000000', 'JBSWY3DPEHPK3PXP')).toBe(false);
  });
});
