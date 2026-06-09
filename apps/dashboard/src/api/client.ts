/**
 * Client HTTP unique base sur axios.
 * ----------------------------------------------------------------
 * Comportement:
 *   - Ajoute automatiquement Authorization: Bearer <accessToken>
 *   - Sur 401, tente UNE fois un /refresh puis re-rejoue la requete.
 *   - Si le refresh echoue, deconnecte l'utilisateur et redirige /app/login.
 *
 * Stockage des tokens:
 *   - accessToken en memoire (Zustand) - pas localStorage (XSS).
 *   - refreshToken en sessionStorage (a auditer).
 */

import axios, { type AxiosError, type AxiosInstance } from 'axios';
import { useAuthStore } from '../stores/authStore';

const baseURL = import.meta.env.VITE_API_URL ?? '/api/v1';

export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing: Promise<string | null> | null = null;

api.interceptors.response.use(
  (r) => r,
  async (err: AxiosError) => {
    const original = err.config as typeof err.config & { _retried?: boolean };
    if (err.response?.status !== 401 || original?._retried) {
      throw err;
    }
    if (!original) throw err;
    original._retried = true;

    if (!refreshing) {
      refreshing = (async () => {
        const rt = useAuthStore.getState().refreshToken;
        if (!rt) return null;
        try {
          const { data } = await axios.post(`${baseURL}/auth/refresh`, {
            refreshToken: rt,
          });
          const tokens = data.data;
          useAuthStore.getState().setTokens(tokens);
          return tokens.accessToken;
        } catch {
          useAuthStore.getState().logout();
          window.location.href = '/app/login';
          return null;
        } finally {
          refreshing = null;
        }
      })();
    }

    const newToken = await refreshing;
    if (!newToken) throw err;
    if (original.headers) {
      original.headers.Authorization = `Bearer ${newToken}`;
    }
    return api(original);
  },
);
