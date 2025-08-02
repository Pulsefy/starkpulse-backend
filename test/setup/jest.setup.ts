import { TestEnvironment } from '../utils/test-environment';

// Global test setup
beforeAll(async () => {
  await TestEnvironment.setupTestContainers();
}, 120000); // 2 minutes timeout for container setup

afterAll(async () => {
  await TestEnvironment.cleanupTestContainers();
}, 60000); // 1 minute timeout for cleanup

// Mock external services
jest.mock('starknet', () => ({
  Provider: jest.fn().mockImplementation(() => ({
    getEvents: jest.fn().mockResolvedValue([]),
    callContract: jest.fn().mockResolvedValue({ result: [] }),
    getBlock: jest.fn().mockResolvedValue({ block_number: 12345 }),
    getTransaction: jest.fn().mockResolvedValue({ status: 'ACCEPTED_ON_L2' }),
  })),
  Contract: jest.fn().mockImplementation(() => ({
    call: jest.fn().mockResolvedValue([]),
    invoke: jest.fn().mockResolvedValue({ transaction_hash: '0x123' }),
  })),
  CallData: {
    compile: jest.fn().mockReturnValue([]),
  },
}));

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    pipeline: jest.fn().mockReturnValue({
      set: jest.fn(),
      exec: jest.fn().mockResolvedValue([]),
    }),
    disconnect: jest.fn(),
  }));
});

// Mock Kafka
jest.mock('kafkajs', () => ({
  Kafka: jest.fn().mockImplementation(() => ({
    producer: jest.fn().mockReturnValue({
      connect: jest.fn(),
      send: jest.fn(),
      disconnect: jest.fn(),
    }),
    consumer: jest.fn().mockReturnValue({
      connect: jest.fn(),
      subscribe: jest.fn(),
      run: jest.fn(),
      disconnect: jest.fn(),
    }),
  })),
}));

// Mock Bull queues
jest.mock('bull', () => {
  return jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    process: jest.fn(),
    on: jest.fn(),
    clean: jest.fn(),
    close: jest.fn(),
  }));
});

// Mock external HTTP services
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  })),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

// Increase test timeout
jest.setTimeout(30000);

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
      toHaveValidUUID(): R;
      toBeValidDate(): R;
    }
  }
}

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
  toHaveValidUUID(received: string) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },
  toBeValidDate(received: any) {
    const pass = received instanceof Date && !isNaN(received.getTime());
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid Date`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid Date`,
        pass: false,
      };
    }
  },
});
