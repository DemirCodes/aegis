// ============================================
// @aegis/audit - Jest Config
// ============================================

import type { Config } from 'jest';

const config: Config = {
  // Test dosyalarını bul
  roots: ['<rootDir>/tests'],

  // TypeScript test dosyalarını tanı
  testMatch: [
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/*.test.ts',
  ],

  // Boş dosyaları hariç tut
  testPathIgnorePatterns: [
    '/node_modules/',
    'tests/unit/audit-trail.test.ts',
  ],

  // ts-jest ile TypeScript dönüşümü
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },

  passWithNoTests: true,
  forceExit: true, 
  maxWorkers: 1,

  // Test ortamı
  testEnvironment: 'node',

  // Modül alias'ları (tsconfig paths ile uyumlu)
  moduleNameMapper: {
    '^@aegis/core$': '<rootDir>/../aegis-core/src/index.ts',
  },

  // Coverage ayarları (opsiyonel)
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'json'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts',
    '!src/**/index.ts',
    '!src/types/**/*.ts',
  ],

  // Test timeout (PDF export gibi uzun işlemler için)
  testTimeout: 10000,

  // Her test dosyasından önce çalışacak setup
  setupFilesAfterEnv: [],

  // Verbose çıktı (hangi test geçti/başarısız oldu)
  verbose: true,
  
};

export default config;