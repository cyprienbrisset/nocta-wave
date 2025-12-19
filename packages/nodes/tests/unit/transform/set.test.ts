import { describe, it, expect, beforeEach } from 'vitest';
import { setNode, SetSchema } from '../../../src/transform/set';
import { createMockContext, createMockInput } from '../../mocks';

describe('Set Node', () => {
  describe('Schema Validation', () => {
    it('should parse valid config with defaults', () => {
      const config = SetSchema.parse({});
      expect(config.mode).toBe('set');
      expect(config.keepOnlySet).toBe(false);
      expect(config.values).toEqual([]);
    });

    it('should parse config with custom values', () => {
      const config = SetSchema.parse({
        mode: 'append',
        values: [{ key: 'name', value: 'test' }],
        keepOnlySet: true,
      });
      expect(config.mode).toBe('append');
      expect(config.keepOnlySet).toBe(true);
      expect(config.values).toHaveLength(1);
    });

    it('should reject invalid mode', () => {
      expect(() => SetSchema.parse({ mode: 'invalid' })).toThrow();
    });
  });

  describe('Node Definition', () => {
    it('should have correct type', () => {
      expect(setNode.type).toBe('transform.set');
    });

    it('should have correct category', () => {
      expect(setNode.category).toBe('transform');
    });

    it('should have required inputs', () => {
      expect(setNode.inputs).toHaveLength(3);
      expect(setNode.inputs.map(i => i.name)).toContain('mode');
      expect(setNode.inputs.map(i => i.name)).toContain('values');
      expect(setNode.inputs.map(i => i.name)).toContain('keepOnlySet');
    });

    it('should have output', () => {
      expect(setNode.outputs).toHaveLength(1);
      expect(setNode.outputs[0].name).toBe('data');
    });
  });

  describe('Node Runner', () => {
    const context = createMockContext();

    it('should set values in data', async () => {
      const input = createMockInput({
        data: { existing: 'value' },
        config: {
          mode: 'set',
          values: [{ key: 'newKey', value: 'newValue' }],
          keepOnlySet: false,
        },
      });

      const result = await setNode.runner(input, context);

      expect(result.data).toEqual({
        existing: 'value',
        newKey: 'newValue',
      });
    });

    it('should replace existing values', async () => {
      const input = createMockInput({
        data: { name: 'old' },
        config: {
          mode: 'set',
          values: [{ key: 'name', value: 'new' }],
          keepOnlySet: false,
        },
      });

      const result = await setNode.runner(input, context);

      expect(result.data).toEqual({ name: 'new' });
    });

    it('should append to arrays', async () => {
      const input = createMockInput({
        data: { items: ['a', 'b'] },
        config: {
          mode: 'append',
          values: [{ key: 'items', value: 'c' }],
          keepOnlySet: false,
        },
      });

      const result = await setNode.runner(input, context);

      expect(result.data).toEqual({ items: ['a', 'b', 'c'] });
    });

    it('should remove keys', async () => {
      const input = createMockInput({
        data: { keep: 'yes', remove: 'no' },
        config: {
          mode: 'remove',
          values: [{ key: 'remove', value: null }],
          keepOnlySet: false,
        },
      });

      const result = await setNode.runner(input, context);

      expect(result.data).toEqual({ keep: 'yes' });
      expect((result.data as Record<string, unknown>).remove).toBeUndefined();
    });

    it('should keep only set fields when keepOnlySet is true', async () => {
      const input = createMockInput({
        data: { existing1: 'a', existing2: 'b' },
        config: {
          mode: 'set',
          values: [{ key: 'newKey', value: 'value' }],
          keepOnlySet: true,
        },
      });

      const result = await setNode.runner(input, context);

      expect(result.data).toEqual({ newKey: 'value' });
    });

    it('should handle empty input data', async () => {
      const input = createMockInput({
        data: null,
        config: {
          mode: 'set',
          values: [{ key: 'key', value: 'value' }],
          keepOnlySet: false,
        },
      });

      const result = await setNode.runner(input, context);

      expect(result.data).toEqual({ key: 'value' });
    });

    it('should handle multiple values', async () => {
      const input = createMockInput({
        data: {},
        config: {
          mode: 'set',
          values: [
            { key: 'a', value: 1 },
            { key: 'b', value: 2 },
            { key: 'c', value: 3 },
          ],
          keepOnlySet: false,
        },
      });

      const result = await setNode.runner(input, context);

      expect(result.data).toEqual({ a: 1, b: 2, c: 3 });
    });

    it('should log execution', async () => {
      const mockContext = createMockContext();
      const input = createMockInput({
        data: {},
        config: { mode: 'set', values: [], keepOnlySet: false },
      });

      await setNode.runner(input, mockContext);

      expect(mockContext.logger.info).toHaveBeenCalledWith('Set node: set mode');
    });
  });
});
