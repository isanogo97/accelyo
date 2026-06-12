/**
 * Client HTTP pour l'API "student-auth" d'Accelyo (app etudiant).
 * ----------------------------------------------------------------
 * Base: https://accelyo.fr/api/v1
 * Reponses au format { success, data }. Auth par Bearer token unique
 * (pas de refresh token sur ce flux). Le token est stocke via
 * utils/keychain (expo-secure-store).
 */
import axios from 'axios';
import Constants from 'expo-constants';
import { useSessionStore } from '../store/sessionStore';

const API_URL =
  (Constants.expoConfig?.extra as { studentApiUrl?: string })?.studentApiUrl ??
  'https://accelyo.fr/api/v1';

export const studentApi = axios.create({ baseURL: API_URL, timeout: 15000 });

studentApi.interceptors.request.use((config) => {
  const token = useSessionStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Enveloppe standard de l'API. */
interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export type EstablishmentSector = 'SCHOOL' | 'LIBRARY' | string;

export interface Establishment {
  name: string;
  sector: EstablishmentSector;
  brandColor: string;
  logoUrl: string | null;
}

export interface Student {
  firstName: string;
  lastName: string;
  studentNumber: string;
  email: string;
  enrollmentYear: number;
  program: string;
  /** UID (hex MAJUSCULES) de la carte physique liee au compte, ou null. */
  physicalCardUid?: string | null;
}

export type CardStatus = 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'REVOKED' | string;

export interface StudentCard {
  status: CardStatus;
  cardUid: string;
  expiresAt: string;
}

export interface MeResponse {
  student: Student;
  card: StudentCard | null;
  establishment: Establishment;
  marketingConsent: boolean;
}

/** Petit utilitaire pour extraire un message d'erreur lisible. */
export function errorMessage(e: unknown, fallback = 'Une erreur est survenue'): string {
  const err = e as {
    response?: { data?: { error?: { message?: string }; message?: string } };
  };
  return (
    err.response?.data?.error?.message ??
    err.response?.data?.message ??
    fallback
  );
}

export async function activate(token: string, password: string): Promise<string> {
  const { data } = await studentApi.post<ApiEnvelope<{ token: string }>>(
    '/student-auth/activate',
    { token, password },
  );
  return data.data.token;
}

export async function login(email: string, password: string): Promise<string> {
  const { data } = await studentApi.post<ApiEnvelope<{ token: string }>>(
    '/student-auth/login',
    { email, password },
  );
  return data.data.token;
}

export async function fetchMe(): Promise<MeResponse> {
  const { data } = await studentApi.get<ApiEnvelope<MeResponse>>('/student-auth/me');
  return data.data;
}

export async function updateConsent(marketingConsent: boolean): Promise<void> {
  await studentApi.patch('/student-auth/me/consent', { marketingConsent });
}

export async function fetchGoogleWalletUrl(): Promise<string> {
  const { data } = await studentApi.get<ApiEnvelope<{ saveUrl: string }>>(
    '/student-auth/me/wallet/google',
  );
  return data.data.saveUrl;
}

/**
 * Lie une carte etudiante PHYSIQUE existante (parc deja deploye) au
 * compte courant, a partir de l'UID lu en NFC (hex MAJUSCULES, 8-20
 * caracteres). Renvoie l'UID enregistre cote serveur.
 */
export async function linkPhysicalCard(
  uid: string,
): Promise<{ physicalCardUid: string }> {
  const { data } = await studentApi.post<ApiEnvelope<{ physicalCardUid: string }>>(
    '/student-auth/me/physical-card',
    { uid },
  );
  return data.data;
}
