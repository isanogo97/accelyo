/**
 * Store d'authentification mobile.
 * ----------------------------------------------------------------
 * ATTENTION: Stocker des tokens dans Zustand (en memoire) est OK pour
 * la session courante. Pour la persistance, on utilise expo-secure-store
 * (Keychain iOS / Keystore Android) - voir utils/keychain.ts.
 *
 * Au demarrage de l'app, on rehydrate depuis le secure store (voir
 * App.tsx -> useEffect bootstrap a implementer).
 */
import { create } from 'zustand';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  setTokens: (t: { accessToken: string; refreshToken: string }) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  setTokens: ({ accessToken, refreshToken }) =>
    set({ accessToken, refreshToken }),
  clear: () => set({ accessToken: null, refreshToken: null }),
}));
