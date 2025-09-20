/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['**/?(*.)+(spec|test).ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  moduleNameMapper: {
    '^@data/(.*)$': '<rootDir>/../../libs/data/src/lib/$1',
    '^@auth-lib/(.*)$': '<rootDir>/../../libs/auth/src/lib/$1',
    '^@auth/(.*)$': '<rootDir>/../../libs/auth/src/lib/$1',
  },
  transformIgnorePatterns: ['/node_modules/(?!(@nestjs|rxjs)/)'],
  setupFiles: ['dotenv/config'],
  collectCoverageFrom: ['<rootDir>/src/**/*.ts', '!<rootDir>/src/main.ts'],
};
