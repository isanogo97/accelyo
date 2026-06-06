/** Tests du generateur de nonce anti-replay. */
import { generateNonce } from '../nonce';

describe('generateNonce', () => {
  it('produit 32 caracteres hex (16 bytes)', () => {
    const n = generateNonce();
    expect(n).toMatch(/^[0-9a-f]{32}$/);
  });

  it('est unique a chaque appel', () => {
    const set = new Set(Array.from({ length: 1000 }, () => generateNonce()));
    expect(set.size).toBe(1000);
  });
});
