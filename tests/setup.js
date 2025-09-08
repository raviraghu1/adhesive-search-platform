import { jest } from '@jest/globals';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Mock logger to reduce test output
jest.mock('../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    logRequest: jest.fn(),
    logError: jest.fn(),
    logDatabaseOperation: jest.fn(),
    logSearchQuery: jest.fn(),
    logAIOperation: jest.fn(),
    stream: { write: jest.fn() },
  },
}));

// Global test timeout
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Close connections after all tests
afterAll(async () => {
  // Add cleanup code here if needed
  await new Promise(resolve => setTimeout(resolve, 500));
});