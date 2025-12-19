/**
 * Mock NodeContext for testing node runners
 */
import { vi } from 'vitest';
import type { NodeContext, NodeLogger } from '@ws-flows/shared';

/**
 * Create a mock logger for testing
 */
export function createMockLogger(): NodeLogger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
}

/**
 * Create a mock NodeContext for testing
 */
export function createMockContext(overrides?: Partial<NodeContext>): NodeContext {
  return {
    logger: createMockLogger(),
    nodeId: 'test-node-id',
    workflowId: 'test-workflow-id',
    executionId: 'test-execution-id',
    ...overrides,
  };
}

/**
 * Create mock node input for testing
 */
export interface MockNodeInput<TConfig = Record<string, unknown>> {
  data: unknown;
  config: TConfig;
  credentials?: Record<string, unknown>;
}

export function createMockInput<TConfig = Record<string, unknown>>(
  overrides?: Partial<MockNodeInput<TConfig>>
): MockNodeInput<TConfig> {
  return {
    data: {},
    config: {} as TConfig,
    ...overrides,
  };
}
