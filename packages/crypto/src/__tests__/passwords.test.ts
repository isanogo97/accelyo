/**
 * Tests bcrypt (hash mots de passe).
 * NOTE: bcrypt est un module natif. Ces tests s'executent sur une machine
 * dont le binaire bcrypt correspond a l'OS (CI/poste dev), pas dans un
 * sandbox cross-OS.
 */
import { hashPassword, verifyPassword } from '../passwords';

describe('passwords (bcrypt)', () => {
  it('produit un hash different du clair et verifiable', async () => {
    const hash = await hashPassword('MotDePasse123!@#');
    expect(hash).not.toBe('MotDePasse123!@#');
    expect(hash.startsWith('$2')).toBe(true);
    expect(await verifyPassword('MotDePasse123!@#', hash)).toBe(true);
  });

  it('rejette un mauvais mot de passe', async () => {
    const hash = await hashPassword('MotDePasse123!@#');
    expect(await verifyPassword('mauvais', hash)).toBe(false);
  });

  it('refuse un mot de passe trop court (< 12)', async () => {
    await expect(hashPassword('court')).rejects.toThrow();
  });

  it('sale chaque hash (deux hash du meme mdp different)', async () => {
    const a = await hashPassword('MotDePasse123!@#');
    const b = await hashPassword('MotDePasse123!@#');
    expect(a).not.toBe(b);
  });
});
