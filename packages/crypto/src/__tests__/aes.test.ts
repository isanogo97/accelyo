/**
 * Tests AES-256-GCM.
 * On verifie que le format est respecte, que decrypt(encrypt(x)) === x,
 * et que le tag d'integrite detecte une alteration.
 */
import { encrypt, decrypt, encryptJSON, decryptJSON } from '../aes';

const KEY = '0'.repeat(64); // 32 bytes hex = 64 caracteres

describe('aes', () => {
  it('roundtrip encrypt/decrypt', () => {
    const plaintext = 'donnee sensible';
    const encrypted = encrypt(plaintext, KEY);
    expect(encrypted.split(':')).toHaveLength(3);
    expect(decrypt(encrypted, KEY)).toBe(plaintext);
  });

  it('detecte une alteration du ciphertext', () => {
    const enc = encrypt('hello', KEY);
    const tampered = enc.replace(/.$/, (c) => (c === 'a' ? 'b' : 'a'));
    expect(() => decrypt(tampered, KEY)).toThrow();
  });

  it('refuse une cle de mauvaise longueur', () => {
    expect(() => encrypt('x', 'short')).toThrow();
  });

  it('roundtrip JSON', () => {
    const obj = { foo: 'bar', n: 42 };
    const enc = encryptJSON(obj, KEY);
    expect(decryptJSON<typeof obj>(enc, KEY)).toEqual(obj);
  });
});
