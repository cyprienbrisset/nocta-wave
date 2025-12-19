import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { delayNode, DelaySchema } from '../../../src/utility/delay';
import { createMockContext, createMockInput } from '../../mocks';

describe('Delay Node', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Schema Validation', () => {
    it('should parse valid config with defaults', () => {
      const config = DelaySchema.parse({});
      expect(config.duration).toBe(1000);
      expect(config.unit).toBe('s');
    });

    it('should parse custom duration', () => {
      const config = DelaySchema.parse({ duration: 5000, unit: 'ms' });
      expect(config.duration).toBe(5000);
      expect(config.unit).toBe('ms');
    });
  });

  describe('Node Definition', () => {
    it('should have correct type', () => {
      expect(delayNode.type).toBe('utility.delay');
    });

    it('should have correct category', () => {
      expect(delayNode.category).toBe('utility');
    });

    it('should have duration and unit inputs', () => {
      const inputNames = delayNode.inputs.map(i => i.name);
      expect(inputNames).toContain('duration');
      expect(inputNames).toContain('unit');
    });
  });

  describe('Node Runner', () => {
    const context = createMockContext();

    it('should delay execution by specified time in milliseconds', async () => {
      const input = createMockInput({
        data: { value: 'test' },
        config: { duration: 100, unit: 'ms' },
      });

      const promise = delayNode.runner(input, context);

      // Advance timers
      await vi.advanceTimersByTimeAsync(100);

      const result = await promise;
      expect(result.data).toEqual({ value: 'test' });
    });

    it('should delay execution by seconds', async () => {
      const input = createMockInput({
        data: { value: 'test' },
        config: { duration: 2, unit: 's' },
      });

      const promise = delayNode.runner(input, context);

      // 2 seconds = 2000ms
      await vi.advanceTimersByTimeAsync(2000);

      const result = await promise;
      expect(result.data).toEqual({ value: 'test' });
    });

    it('should pass through data unchanged', async () => {
      const originalData = { foo: 'bar', num: 42, nested: { a: 1 } };
      const input = createMockInput({
        data: originalData,
        config: { duration: 50, unit: 'ms' },
      });

      const promise = delayNode.runner(input, context);
      await vi.advanceTimersByTimeAsync(50);

      const result = await promise;
      expect(result.data).toEqual(originalData);
    });

    it('should log delay info', async () => {
      const mockContext = createMockContext();
      const input = createMockInput({
        data: {},
        config: { duration: 1, unit: 's' },
      });

      const promise = delayNode.runner(input, mockContext);
      await vi.advanceTimersByTimeAsync(1000);
      await promise;

      expect(mockContext.logger.info).toHaveBeenCalledWith('Delay: waiting 1000ms');
      expect(mockContext.logger.info).toHaveBeenCalledWith('Delay complete');
    });
  });
});
