import { describe, it, expect } from 'vitest';
import { conditionNode, ConditionSchema } from '../../../src/logic/condition';
import { createMockContext, createMockInput } from '../../mocks';

describe('Condition Node', () => {
  describe('Schema Validation', () => {
    it('should require condition', () => {
      expect(() => ConditionSchema.parse({})).toThrow();
    });

    it('should parse valid condition', () => {
      const config = ConditionSchema.parse({
        condition: 'data.value > 10',
      });
      expect(config.condition).toBe('data.value > 10');
      expect(config.combineWith).toBe('AND');
    });

    it('should reject empty condition', () => {
      expect(() => ConditionSchema.parse({ condition: '' })).toThrow();
    });
  });

  describe('Node Definition', () => {
    it('should have correct type', () => {
      expect(conditionNode.type).toBe('logic.condition');
    });

    it('should have correct category', () => {
      expect(conditionNode.category).toBe('logic');
    });

    it('should have true and false outputs', () => {
      const outputNames = conditionNode.outputs.map(o => o.name);
      expect(outputNames).toContain('true');
      expect(outputNames).toContain('false');
    });
  });

  describe('Node Runner', () => {
    const context = createMockContext();

    it('should return true output for truthy condition', async () => {
      const input = createMockInput({
        data: { value: 20 },
        config: {
          condition: 'data.value > 10',
        },
      });

      const result = await conditionNode.runner(input, context);

      expect(result.data.__isCondition).toBe(true);
      expect(result.data.result).toBe(true);
      expect(result.data.outputHandle).toBe('true');
    });

    it('should return false output for falsy condition', async () => {
      const input = createMockInput({
        data: { value: 5 },
        config: {
          condition: 'data.value > 10',
        },
      });

      const result = await conditionNode.runner(input, context);

      expect(result.data.__isCondition).toBe(true);
      expect(result.data.result).toBe(false);
      expect(result.data.outputHandle).toBe('false');
    });

    it('should handle string comparison', async () => {
      const input = createMockInput({
        data: { status: 'active' },
        config: {
          condition: 'data.status === "active"',
        },
      });

      const result = await conditionNode.runner(input, context);

      expect(result.data.result).toBe(true);
    });

    it('should handle boolean values', async () => {
      const input = createMockInput({
        data: { enabled: true },
        config: {
          condition: 'data.enabled',
        },
      });

      const result = await conditionNode.runner(input, context);

      expect(result.data.result).toBe(true);
    });

    it('should handle complex conditions', async () => {
      const input = createMockInput({
        data: { count: 5, status: 'active', type: 'user' },
        config: {
          condition: 'data.count >= 5 && data.status === "active" && data.type === "user"',
        },
      });

      const result = await conditionNode.runner(input, context);

      expect(result.data.result).toBe(true);
    });

    it('should handle OR conditions', async () => {
      const input = createMockInput({
        data: { role: 'guest' },
        config: {
          condition: 'data.role === "admin" || data.role === "guest"',
        },
      });

      const result = await conditionNode.runner(input, context);

      expect(result.data.result).toBe(true);
    });

    it('should handle undefined/null data', async () => {
      const input = createMockInput({
        data: { name: 'test' },
        config: {
          condition: 'data.missing === undefined',
        },
      });

      const result = await conditionNode.runner(input, context);

      expect(result.data.result).toBe(true);
    });

    it('should throw on syntax error in condition', async () => {
      const input = createMockInput({
        data: { value: 10 },
        config: {
          condition: 'data.value >>>>> 10',
        },
      });

      await expect(conditionNode.runner(input, context)).rejects.toThrow();
    });

    it('should preserve original data in output', async () => {
      const originalData = { foo: 'bar', count: 42 };
      const input = createMockInput({
        data: originalData,
        config: {
          condition: 'true',
        },
      });

      const result = await conditionNode.runner(input, context);

      expect(result.data.data).toEqual(originalData);
    });

    it('should log condition evaluation', async () => {
      const mockContext = createMockContext();
      const input = createMockInput({
        data: {},
        config: { condition: 'true' },
      });

      await conditionNode.runner(input, mockContext);

      expect(mockContext.logger.info).toHaveBeenCalledWith('Condition node: evaluating');
    });
  });
});
