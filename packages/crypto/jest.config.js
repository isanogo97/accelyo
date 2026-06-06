/**
 * Jest configure pour ESM + TypeScript (ts-jest).
 * Le projet est en "type": "module" : il faut le preset ESM de ts-jest,
 * traiter les .ts comme ESM, et neutraliser les extensions .js des imports.
 */
/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@accelyo/shared$': '<rootDir>/../shared/src/index.ts',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true }],
  },
};
