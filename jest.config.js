module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages', '<rootDir>/apps'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/*.test.ts',
    '**/*.spec.ts'
  ],
  moduleNameMapper: {
    '^@aegis/core$': '<rootDir>/packages/aegis-core/src',
    '^@aegis/core/(.*)$': '<rootDir>/packages/aegis-core/src/$1',
    '^@aegis/audit$': '<rootDir>/packages/aegis-audit/src',
    '^@aegis/observability$': '<rootDir>/packages/aegis-observability/src',
    '^@aegis/resilience$': '<rootDir>/packages/aegis-resilience/src',
    '^@aegis/cache$': '<rootDir>/packages/aegis-cache/src',
    '^@aegis/validation$': '<rootDir>/packages/aegis-validation/src',
    '^@aegis/queue$': '<rootDir>/packages/aegis-queue/src',
    '^@aegis/security$': '<rootDir>/packages/aegis-security/src',
    '^@aegis/testing$': '<rootDir>/packages/aegis-testing/src',
    '^@aegis/performance$': '<rootDir>/packages/aegis-performance/src',
    '^@aegis/migration$': '<rootDir>/packages/aegis-migration/src'
  },
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    'apps/*/src/**/*.ts',
    '!**/*.types.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterSetup: ['<rootDir>/jest.setup.js'],
  globalSetup: '<rootDir>/jest.setup.js',
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  verbose: true,
  testTimeout: 30000
};