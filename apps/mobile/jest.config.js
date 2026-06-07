/**
 * Jest configure pour Expo / React Native (preset jest-expo).
 * - moduleNameMapper: resout @accelyo/shared vers la source du package.
 * - transformIgnorePatterns: transpile aussi les modules RN/Expo/@accelyo (ESM).
 */
module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@accelyo/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@accelyo/.*))',
  ],
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
};
