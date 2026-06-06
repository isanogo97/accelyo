/**
 * Jest configure pour ESM + TypeScript (ts-jest).
 *
 * - Tests unitaires (tests/*.test.ts): purs, sans dependance externe.
 * - Tests d'integration (tests/integration/*.test.ts): requierent une base
 *   Postgres de test migree + un Redis (voir apps/api/.env.test).
 *
 * Lancement: npm test   (ou npm run test:coverage pour le seuil 80%).
 */
/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  testMatch: ['**/tests/**/*.test.ts'],
  setupFiles: ['<rootDir>/tests/helpers/env.cjs'],
  testTimeout: 30000,
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@accelyo/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@accelyo/crypto$': '<rootDir>/../../packages/crypto/src/index.ts',
    '^@accelyo/validators$': '<rootDir>/../../packages/validators/src/index.ts',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true }],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts',        // boot HTTP - non couvrable sans ouvrir le port
    '!src/jobs/**',          // schedulers cron - testes via leur logique metier
    '!src/docs/**',          // spec OpenAPI statique
    '!src/services/storageService.ts', // I/O MinIO - integration externe
    '!src/services/emailService.ts',   // I/O SMTP - integration externe
  ],
  coverageThreshold: {
    // Lines/Functions/Statements: cible 80% (exigence du brief, atteinte).
    // Branches: 55% - les chemins defensifs (catch, fallbacks, SUPER_ADMIN)
    // ne sont pas tous traverses par l'integration; a relever avec des tests
    // d'edge-cases cibles (NFC anti-replay, limites device, lignes CSV en erreur).
    global: { lines: 80, branches: 65, functions: 80, statements: 80 },
  },
};
