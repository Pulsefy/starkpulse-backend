import 'reflect-metadata';

// Global test setup
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.NOTIFICATION_SERVICE_URL = 'http://localhost:3001';
  process.env.NOTIFICATION_API_KEY = 'test-api-key';
});

afterAll(async () => {
  // Cleanup after all tests
  delete process.env.NOTIFICATION_SERVICE_URL;
  delete process.env.NOTIFICATION_API_KEY;
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
