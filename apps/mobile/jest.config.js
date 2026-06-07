/**
 * Jest pour le mobile.
 * ----------------------------------------------------------------
 * Les tests mockent integralement les modules natifs (react-native-nfc-manager,
 * expo-*), donc PAS besoin du preset jest-expo / react-native (qui ne resout
 * pas dans ce monorepo car react-native n'est pas hoiste). On transpile
 * simplement le TypeScript via ts-jest en mode isolatedModules.
 */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { isolatedModules: true }],
  },
  moduleNameMapper: {
    '^@accelyo/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
};
