/**
 * Tests de l'empreinte appareil (mocks keychain + expo-*).
 */
const store: Record<string, string> = {};

jest.mock('../utils/keychain', () => ({
  __esModule: true,
  STORAGE_KEYS: { DEVICE_FINGERPRINT: 'accelyo_device_fingerprint' },
  readSecure: jest.fn(async (k: string) => store[k] ?? null),
  saveSecure: jest.fn(async (k: string, v: string) => {
    store[k] = v;
  }),
}));

jest.mock('expo-device', () => ({
  modelId: 'iPhone15',
  osName: 'iOS',
  osVersion: '17.0',
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { installationId: 'install-123' },
}));

jest.mock('expo-crypto', () => ({
  __esModule: true,
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: jest.fn(async () => 'deadbeefhash'),
}));

import { getOrCreateFingerprint } from '../utils/deviceFingerprint';

describe('getOrCreateFingerprint', () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
  });

  it('genere puis stocke une empreinte si absente', async () => {
    const fp = await getOrCreateFingerprint();
    expect(fp).toBe('deadbeefhash');
    expect(store['accelyo_device_fingerprint']).toBe('deadbeefhash');
  });

  it('reutilise l empreinte deja stockee', async () => {
    store['accelyo_device_fingerprint'] = 'existing-fp';
    const fp = await getOrCreateFingerprint();
    expect(fp).toBe('existing-fp');
  });
});
