export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom', // Simulates browser-like environment
  roots: ['<rootDir>/__tests__'], // Restrict tests to the '__tests__' folder
  extensionsToTreatAsEsm: ['.ts', '.tsx'], // Treat TS/TSX as ES modules
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1', // Resolve relative imports without '.js'
    '^@/(.*)$': '<rootDir>/src/$1', // Alias for 'src'
    '^@core/(.*)$': '<rootDir>/src/core/$1', // Alias for 'src/core'
    '^@algorithms/(.*)$': '<rootDir>/src/algorithms/$1', // Alias for 'src/algorithms'
    '^@storage/(.*)$': '<rootDir>/src/storage/$1', // Alias for 'src/storage'
    '^@utils/(.*)$': '<rootDir>/src/utils/$1', // Alias for 'src/utils'
    '^@types$': '<rootDir>/src/types', // Alias for 'src/types'
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true, // Enable ESM support for TypeScript
        tsconfig: 'tsconfig.json', // Point to your TypeScript config
      },
    ],
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'], // Include setup file
  testMatch: [
    '<rootDir>/__tests__/**/*.{ts,tsx}', // Match files in '__tests__' folders
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}', // Match files in '__tests__' folders within 'src'
    '<rootDir>/src/**/*.{spec,test}.{ts,tsx}', // Match 'spec' and 'test' files
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'], // Supported file extensions
  collectCoverage: true, // Enable coverage collection
  coverageDirectory: 'coverage', // Output directory for coverage reports
  coverageReporters: ['json', 'lcov', 'text', 'clover'], // Formats for coverage reports
  coverageThreshold: {
    global: {
      statements: 80, // Require 80% statement coverage globally
      branches: 80, // Require 80% branch coverage globally
      functions: 80, // Require 80% function coverage globally
      lines: 80, // Require 80% line coverage globally
    },
  },
  globals: {
    'ts-jest': {
      useESM: true, // Use ESM in ts-jest
      tsconfig: {
        moduleResolution: 'node', // Use Node.js module resolution
      },
    },
  },
  testTimeout: 10000, // Set default test timeout to 10 seconds
  verbose: true, // Display detailed test results
};
