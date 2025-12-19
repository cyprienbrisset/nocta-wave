/**
 * Jest Global Setup for @ws-flows/api
 */

// Increase timeout for database operations
jest.setTimeout(30000);

// Mock console during tests (optional)
if (process.env.SILENT_TESTS === 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };
}

// Global cleanup
afterAll(async () => {
  // Clean up any database connections, etc.
});

// Utility for async tests
declare global {
  namespace NodeJS {
    interface Global {
      wait: (ms: number) => Promise<void>;
    }
  }
}

(global as any).wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
