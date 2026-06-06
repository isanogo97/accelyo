/**
 * Jest configure pour ESM + TypeScript (ts-jest).
 * Le monorepo est en "type": "module" : preset ESM obligatoire,
 * mapping des packages @accelyo/* vers leur source, et neutralisation
 * des extensions .js sur les imports relatifs.
 *
 * Les tests d'integration (tests/auth.test.ts) requierent Postgres +
 * Redis : ils tournent en CI (voir .github/workflows). Les tests
 * unitaires purs (rbac, errors) tournent partout sans dependance.
 */
/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  testMatch: ['**/tests/**/*.test.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@accelyo/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@accelyo/crypto$': '<rootDir>/../../packages/crypto/src/index.ts',
    '^@accelyo/validators$': '<rootDir>/../../packages/validators/src/index.ts',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true }],
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coverageThreshold: {
    global: { lines: 80, branches: 70, functions: 80, statements: 80 },
  },
};
