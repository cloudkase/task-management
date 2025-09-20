/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-preset-angular',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setup-jest.ts'],

  // 👇 add this line
  resolver: 'jest-preset-angular/build/resolvers/ng-jest-resolver.js',

  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.html$',
        useESM: true,
      },
    ],
  },
  extensionsToTreatAsEsm: ['.ts'],
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$|@angular|rxjs|tslib)'],
  testEnvironmentOptions: { customExportConditions: ['node', 'jest'] },
  moduleFileExtensions: ['ts', 'html', 'js', 'mjs', 'json'],
  testMatch: ['**/?(*.)+(spec|test).ts'],
  moduleNameMapper: { '\\.(css|scss|sass)$': 'identity-obj-proxy' },
};
