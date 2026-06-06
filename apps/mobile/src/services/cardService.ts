/**
 * Recuperation et stockage local de la carte etudiante.
 */
import { api } from './apiClient';
import { saveSecure, readSecure, STORAGE_KEYS } from '../utils/keychain';
import { getOrCreateFingerprint } from '../utils/deviceFingerprint';
import type { CardPayload } from '@accelyo/shared';

interface CardResponse {
  card: {
    id: string;
    cardUid: string;
    status: string;
    issuedAt: string;
    expiresAt: string;
  };
  token: string;
  payload: CardPayload;
}

export async function fetchAndStoreCard(): Promise<CardResponse> {
  const fingerprint = await getOrCreateFingerprint();
  const { data } = await api.get<{ data: CardResponse }>('/mobile/card', {
    params: { fingerprint },
  });
  await saveSecure(STORAGE_KEYS.CARD_TOKEN, data.data.token);
  return data.data;
}

export async function loadStoredToken(): Promise<string | null> {
  return readSecure(STORAGE_KEYS.CARD_TOKEN);
}
