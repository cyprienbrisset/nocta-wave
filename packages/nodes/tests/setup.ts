/**
 * Vitest Global Setup for @ws-flows/nodes
 */
import { vi } from 'vitest';

// Mock external fetch calls
global.fetch = vi.fn();

// Setup console methods
beforeAll(() => {
  // Silence console during tests unless DEBUG is set
  if (!process.env.DEBUG) {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Keep console.error for debugging
  }
});

afterEach(() => {
  vi.clearAllMocks();
});

afterAll(() => {
  vi.restoreAllMocks();
});
