/**
 * Tests du store d'authentification (logique pure Zustand).
 * sessionStorage est stube car vitest tourne en environnement node.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

function makeStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
    key: () => null,
    length: 0,
  } as unknown as Storage;
}

vi.stubGlobal('sessionStorage', makeStorage());

const { useAuthStore } = await import('../stores/authStore');

const reset = () =>
  useAuthStore.setState({ user: null, accessToken: null, refreshToken: null });

describe('authStore', () => {
  beforeEach(reset);

  it('setUser met a jour l utilisateur', () => {
    useAuthStore.getState().setUser({
      id: 'u1', email: 'a@test.fr', role: 'SUPER_ADMIN',
      universityId: null, mfaEnabled: false,
    });
    expect(useAuthStore.getState().user?.email).toBe('a@test.fr');
  });

  it('setTokens stocke en memoire ET persiste le refresh en sessionStorage', () => {
    useAuthStore.getState().setTokens({ accessToken: 'AAA', refreshToken: 'RRR' });
    expect(useAuthStore.getState().accessToken).toBe('AAA');
    expect(useAuthStore.getState().refreshToken).toBe('RRR');
    expect(sessionStorage.getItem('accelyo:rt')).toBe('RRR');
  });

  it('logout efface l etat et le refresh persiste', () => {
    useAuthStore.getState().setTokens({ accessToken: 'AAA', refreshToken: 'RRR' });
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().refreshToken).toBeNull();
    expect(sessionStorage.getItem('accelyo:rt')).toBeNull();
  });
});
