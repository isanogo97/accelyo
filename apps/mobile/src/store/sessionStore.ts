/**
 * Store de session de l'app etudiant (token + profil /me).
 * ----------------------------------------------------------------
 * Le token vit en memoire (zustand) pour la session courante et est
 * persiste via expo-secure-store (utils/keychain) pour survivre aux
 * redemarrages. Le profil (/me) est mis en cache ici apres connexion.
 */
import { create } from 'zustand';
import type { MeResponse } from '../services/studentApi';

interface SessionState {
  token: string | null;
  /** true tant qu'on rehydrate le token depuis le secure store. */
  bootstrapping: boolean;
  me: MeResponse | null;
  setToken: (token: string) => void;
  setBootstrapped: (token: string | null) => void;
  setMe: (me: MeResponse) => void;
  clear: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  token: null,
  bootstrapping: true,
  me: null,
  setToken: (token) => set({ token }),
  setBootstrapped: (token) => set({ token, bootstrapping: false }),
  setMe: (me) => set({ me }),
  clear: () => set({ token: null, me: null }),
}));
