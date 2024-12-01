import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util'; /
interface IDBEventTarget {
  result: any;
}

interface IDBEvent {
  target: IDBEventTarget;
  type: string;
}

// Mock Event Handler Types
type IDBEventHandler = (event: IDBEvent) => void;

interface IDBRequest {
  result: any;
  onerror: IDBEventHandler | null;
  onsuccess: IDBEventHandler | null;
  onupgradeneeded: IDBEventHandler | null;
}

interface IDBObjectStore {
  createIndex: jest.Mock;
  put: jest.Mock;
  get: jest.Mock;
  delete: jest.Mock;
  clear: jest.Mock;
}

// Handle Node.js TextEncoder/TextDecoder
const textEncodingPolyfill = () => {
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
};

textEncodingPolyfill();

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
const createMockIDBRequest = (): IDBRequest => ({
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
          result: null
        })),
        delete: jest.fn(),
        clear: jest.fn()
      })
    })
  },
  onerror: null,
  onsuccess: null,
  onupgradeneeded: null
});

const indexedDBMock = {
  databases: new Map(),

  open: jest.fn().mockImplementation((name: string) => {
    const request = createMockIDBRequest();

    setTimeout(() => {
      if (request.onupgradeneeded) {
        request.onupgradeneeded({
          target: { result: request.result },
          type: 'upgradeneeded'
        });
      }
      if (request.onsuccess) {
        request.onsuccess({
          target: { result: request.result },
          type: 'success'
        });
      }
    }, 0);

    return request;
  }),

  deleteDatabase: jest.fn().mockImplementation((name: string) => {
    const request = createMockIDBRequest();

    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess({
          target: { result: null },
          type: 'success'
        });
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

global.sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Types
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
    }
  }

  function sleep(ms: number): Promise<void>;
}
