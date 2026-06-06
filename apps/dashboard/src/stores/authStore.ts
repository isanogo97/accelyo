/**
 * Store d'authentification (Zustand).
 * ----------------------------------------------------------------
 * NE PAS persister l'access token en localStorage - vulnerable XSS.
 * Le refresh token est persiste en sessionStorage pour un rechargement
 * de page sans re-login. L'access token reste en memoire uniquement.
 */
import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  role: string;
  universityId: string | null;
  mfaEnabled: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setUser: (user: User) => void;
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
  logout: () => void;
}

const REFRESH_KEY = 'accelyo:rt';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: sessionStorage.getItem(REFRESH_KEY),

  setUser: (user) => set({ user }),

  setTokens: ({ accessToken, refreshToken }) => {
    sessionStorage.setItem(REFRESH_KEY, refreshToken);
    set({ accessToken, refreshToken });
  },

  logout: () => {
    sessionStorage.removeItem(REFRESH_KEY);
    set({ user: null, accessToken: null, refreshToken: null });
  },
}));
