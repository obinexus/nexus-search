import '@testing-library/jest-dom';

// Handle Node.js TextEncoder/TextDecoder
if (typeof globalThis.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  globalThis.TextEncoder = TextEncoder;
  globalThis.TextDecoder = TextDecoder;
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Performance monitoring
const TEST_TIMEOUT_THRESHOLD = 5000;
let testStartTime: number;

beforeAll(() => {
  testStartTime = Date.now();
});

afterEach(() => {
  const duration = Date.now() - testStartTime;
  if (duration > TEST_TIMEOUT_THRESHOLD) {
    console.warn(
      `Test took ${duration}ms to complete, exceeding the ${TEST_TIMEOUT_THRESHOLD}ms threshold`
    );
  }
  testStartTime = Date.now();
});

// Mock IndexedDB
const indexedDBMock = {
  databases: new Map(),

  open: jest.fn().mockImplementation((name: string) => {
    const request = {
      result: {
        objectStoreNames: {
          contains: jest.fn().mockReturnValue(false)
        },
        createObjectStore: jest.fn().mockReturnValue({
          createIndex: jest.fn()
        }),
        transaction: jest.fn().mockReturnValue({
          objectStore: jest.fn().mockReturnValue({
            put: jest.fn().mockImplementation((value: any) => ({
              onsuccess: null,
              onerror: null
            })),
            get: jest.fn().mockImplementation((key: string) => ({
              onsuccess: null,
              onerror: null,
              result: indexedDBMock.databases.get(key)
            })),
            delete: jest.fn(),
            clear: jest.fn()
          })
        })
      },
      onerror: null,
      onsuccess: null,
      onupgradeneeded: null
    };

    // Simulate async operations
    setTimeout(() => {
      if (request.onupgradeneeded) {
        const event = new Event('upgradeneeded');
        request.onupgradeneeded(event);
      }
      if (request.onsuccess) {
        const event = new Event('success');
        request.onsuccess(event);
      }
    }, 0);

    return request;
  }),

  deleteDatabase: jest.fn().mockImplementation((name: string) => {
    const request = {
      result: null,
      error: null,
      onerror: null,
      onsuccess: null
    };

    setTimeout(() => {
      if (request.onsuccess) {
        const event = new Event('success');
        request.onsuccess(event);
      }
    }, 0);

    return request;
  })
};

Object.defineProperty(window, 'indexedDB', {
  value: indexedDBMock,
  writable: true
});

// Mock Performance API
const performanceMock = {
  now: jest.fn(() => Date.now())
};

Object.defineProperty(window, 'performance', {
  value: performanceMock,
  writable: true
});

// Clear all mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
  indexedDBMock.databases.clear();
});

// Custom matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Global test utilities
global.sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Types
declare global {
  // Add custom matcher types
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
    }
  }

  // Add global utility types
  function sleep(ms: number): Promise<void>;
}

export {};