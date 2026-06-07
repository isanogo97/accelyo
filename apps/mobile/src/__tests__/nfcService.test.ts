/**
 * Tests du service NFC HCE (mock de react-native-nfc-manager).
 */
jest.mock('react-native-nfc-manager', () => ({
  __esModule: true,
  default: {
    start: jest.fn().mockResolvedValue(undefined),
    cancelTechnologyRequest: jest.fn().mockResolvedValue(undefined),
  },
}));

import { nfcService } from '../services/nfcService';
import type { CardPayload } from '@accelyo/shared';

const payload: CardPayload = {
  sub: 'student-1',
  university_id: 'univ-1',
  card_uid: '04AABBCC',
  issued_at: 1,
  expires_at: 2,
  permissions: [],
  fingerprint: 'fp',
};

describe('nfcService', () => {
  afterEach(async () => {
    await nfcService.stopHCE();
  });

  it('demarre l emulation et prepare la reponse HCE', async () => {
    await nfcService.startHCE('signed.jwt.token', payload);
    expect(nfcService.isActive()).toBe(true);
    const prepared = nfcService.getPreparedResponse();
    expect(prepared?.token).toBe('signed.jwt.token');
    expect(prepared?.payload.card_uid).toBe('04AABBCC');
  });

  it('stopHCE desactive l emulation', async () => {
    await nfcService.startHCE('t', payload);
    expect(nfcService.isActive()).toBe(true);
    await nfcService.stopHCE();
    expect(nfcService.isActive()).toBe(false);
  });
});
