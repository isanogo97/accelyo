// Diagnostic LECTURE SEULE du login etudiant.
// Usage (dans le conteneur api):
//   node apps/api/scripts/diag-login.mjs "<email>" "<motdepasse>"
// Ne modifie RIEN. Affiche: etudiant trouve ? mdp present ? mdp valide ?
import { PrismaClient } from '@prisma/client';
import { createHmac } from 'crypto';
import bcrypt from 'bcrypt';

const HMAC_SALT = 'accelyo-search-hash-v1';
function deriveHmacKey(keyHex) {
  return createHmac('sha256', keyHex).update(HMAC_SALT).digest();
}
function hashSearchable(value, keyHex) {
  const normalized = String(value).trim().toLowerCase();
  return createHmac('sha256', deriveHmacKey(keyHex)).update(normalized).digest('hex');
}

const email = process.argv[2];
const password = process.argv[3];
const KEY = process.env.ENCRYPTION_KEY;

if (!email) { console.error('Usage: node diag-login.mjs "<email>" "<motdepasse?>"'); process.exit(1); }
if (!KEY) { console.error('ENCRYPTION_KEY absente de l env du conteneur'); process.exit(1); }

const prisma = new PrismaClient();
const emailHash = hashSearchable(email, KEY);
console.log('email saisi      :', email);
console.log('email normalise  :', String(email).trim().toLowerCase());
console.log('emailHash calcule:', emailHash);

const matches = await prisma.student.findMany({ where: { emailHash } });
console.log('\nEtudiants avec ce emailHash :', matches.length);
for (const s of matches) {
  console.log('  - id=%s univ=%s isActive=%s activatedAt=%s passwordHash=%s',
    s.id, s.universityId, s.isActive, s.activatedAt ? 'oui' : 'NON',
    s.passwordHash ? '(present, ' + s.passwordHash.slice(0, 7) + '...)' : 'NULL');
  if (password && s.passwordHash) {
    const ok = await bcrypt.compare(password, s.passwordHash);
    console.log('      verifyPassword("' + password + '") =>', ok ? 'VALIDE ✅' : 'INVALIDE ❌');
  }
}

if (matches.length === 0) {
  // Aide: l'etudiant existe-t-il sous une autre casse/forme ?
  const total = await prisma.student.count();
  console.log('\nAucun etudiant pour ce hash. Total etudiants en base:', total);
  console.log('=> Soit l email ne correspond a aucun etudiant, soit la cle ENCRYPTION_KEY differe.');
}

await prisma.$disconnect();
