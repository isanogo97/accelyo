/** Tests HMAC-SHA-256 deterministe pour la recherche. */
import { hashSearchable, safeEqual } from '../hash';

const KEY = '0'.repeat(64);

describe('hashSearchable', () => {
  it('est deterministe', () => {
    expect(hashSearchable('alice@univ.fr', KEY)).toBe(
      hashSearchable('alice@univ.fr', KEY),
    );
  });

  it('normalise la casse et les espaces', () => {
    expect(hashSearchable(' Alice@Univ.fr ', KEY)).toBe(
      hashSearchable('alice@univ.fr', KEY),
    );
  });

  it('change avec la cle', () => {
    expect(hashSearchable('x', KEY)).not.toBe(hashSearchable('x', '1'.repeat(64)));
  });

  it('safeEqual detecte les egalites', () => {
    const h = hashSearchable('foo', KEY);
    expect(safeEqual(h, h)).toBe(true);
    expect(safeEqual(h, h.slice(0, -1) + '0')).toBe(false);
  });
});
