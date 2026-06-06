/**
 * Client HTTP mobile - axios + auto-refresh.
 */
import axios from 'axios';
import Constants from 'expo-constants';
import { useAuthStore } from '../store/authStore';
import { saveSecure, STORAGE_KEYS } from '../utils/keychain';

const API_URL =
  (Constants.expoConfig?.extra as { apiUrl?: string })?.apiUrl ??
  'https://api.accelyo.fr/api/v1';

export const api = axios.create({ baseURL: API_URL, timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const original = err.config;
    if (err.response?.status !== 401 || original?._retried) throw err;
    original._retried = true;

    if (!refreshing) {
      refreshing = (async () => {
        const rt = useAuthStore.getState().refreshToken;
        if (!rt) return null;
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken: rt,
          });
          const tokens = data.data;
          useAuthStore.getState().setTokens(tokens);
          await saveSecure(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
          await saveSecure(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
          return tokens.accessToken;
        } catch {
          useAuthStore.getState().clear();
          return null;
        } finally {
          refreshing = null;
        }
      })();
    }
    const token = await refreshing;
    if (!token) throw err;
    original.headers.Authorization = `Bearer ${token}`;
    return api(original);
  },
);
