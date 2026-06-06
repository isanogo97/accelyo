/** Tests signature/verification RSA des cartes NFC. */
import { generateKeyPairSync } from 'crypto';
import { signCardPayload, verifyCardPayload } from '../rsa';
import type { CardPayload } from '@accelyo/shared';

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

function payload(overrides: Partial<CardPayload> = {}): CardPayload {
  const now = Math.floor(Date.now() / 1000);
  return {
    sub: 'student-uuid',
    university_id: 'univ-uuid',
    card_uid: '04A1B2C3D4',
    issued_at: now,
    expires_at: now + 3600,
    permissions: ['door:building-A'],
    fingerprint: 'device-hash',
    ...overrides,
  };
}

describe('rsa card signing', () => {
  it('signe puis verifie un payload valide', () => {
    const token = signCardPayload(payload(), privateKey);
    expect(token.split('.')).toHaveLength(3);
    const verified = verifyCardPayload(token, publicKey);
    expect(verified.sub).toBe('student-uuid');
    expect(verified.card_uid).toBe('04A1B2C3D4');
  });

  it('rejette une signature alteree', () => {
    const token = signCardPayload(payload(), privateKey);
    const tampered = token.slice(0, -2) + (token.slice(-2) === 'AA' ? 'BB' : 'AA');
    expect(() => verifyCardPayload(tampered, publicKey)).toThrow();
  });

  it('rejette une carte expiree', () => {
    const now = Math.floor(Date.now() / 1000);
    const token = signCardPayload(payload({ expires_at: now - 1 }), privateKey);
    expect(() => verifyCardPayload(token, publicKey)).toThrow(/expiree/i);
  });

  it('rejette un token malforme', () => {
    expect(() => verifyCardPayload('pas.un.jwt.valide', publicKey)).toThrow();
  });

  it('rejette la verification avec une autre cle publique', () => {
    const other = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const token = signCardPayload(payload(), privateKey);
    expect(() => verifyCardPayload(token, other.publicKey)).toThrow();
  });
});
