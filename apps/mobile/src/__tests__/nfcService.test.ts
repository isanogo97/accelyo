/**
 * Tests du service NFC HCE (mock du module natif local accelyo-hce).
 */
jest.mock('../../modules/accelyo-hce', () => ({
  __esModule: true,
  isHceSupported: jest.fn(() => true),
  setCard: jest.fn(),
  clearCard: jest.fn(),
  isHceEnabled: jest.fn(() => true),
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

  it('arme la carte et prepare la reponse', async () => {
    await nfcService.startHCE('signed.jwt.token', payload);
    expect(nfcService.isActive()).toBe(true);
    const prepared = nfcService.getPreparedResponse();
    expect(prepared?.token).toBe('signed.jwt.token');
    expect(prepared?.payload.card_uid).toBe('04AABBCC');
  });

  it('stopHCE desarme la carte', async () => {
    await nfcService.startHCE('t', payload);
    expect(nfcService.isActive()).toBe(true);
    await nfcService.stopHCE();
    expect(nfcService.isActive()).toBe(false);
    expect(nfcService.getPreparedResponse()).toBeNull();
  });
});
