import { describe, it, expect } from 'vitest';
import { filterNode, FilterSchema } from '../../../src/transform/filter';
import { createMockContext, createMockInput } from '../../mocks';

describe('Filter Node', () => {
  describe('Schema Validation', () => {
    it('should require condition', () => {
      expect(() => FilterSchema.parse({})).toThrow();
    });

    it('should parse valid config', () => {
      const config = FilterSchema.parse({ condition: 'item.value > 10' });
      expect(config.condition).toBe('item.value > 10');
      expect(config.outputKey).toBe('items');
    });
  });

  describe('Node Definition', () => {
    it('should have correct type', () => {
      expect(filterNode.type).toBe('transform.filter');
    });

    it('should have correct category', () => {
      expect(filterNode.category).toBe('transform');
    });

    it('should have condition input', () => {
      expect(filterNode.inputs.map(i => i.name)).toContain('condition');
    });

    it('should have items and rejected outputs', () => {
      const outputNames = filterNode.outputs.map(o => o.name);
      expect(outputNames).toContain('items');
      expect(outputNames).toContain('rejected');
    });
  });

  describe('Node Runner', () => {
    const context = createMockContext();

    it('should filter array based on condition', async () => {
      const input = createMockInput({
        data: [
          { name: 'a', value: 10 },
          { name: 'b', value: 20 },
          { name: 'c', value: 30 },
        ],
        config: {
          condition: 'item.value > 15',
        },
      });

      const result = await filterNode.runner(input, context);

      expect(result.data.items).toHaveLength(2);
      expect(result.data.items).toEqual([
        { name: 'b', value: 20 },
        { name: 'c', value: 30 },
      ]);
      expect(result.data.rejected).toHaveLength(1);
    });

    it('should return empty array when no matches', async () => {
      const input = createMockInput({
        data: [
          { value: 1 },
          { value: 2 },
        ],
        config: {
          condition: 'item.value > 100',
        },
      });

      const result = await filterNode.runner(input, context);

      expect(result.data.items).toEqual([]);
      expect(result.data.rejected).toHaveLength(2);
    });

    it('should return all items when all match', async () => {
      const input = createMockInput({
        data: [
          { active: true },
          { active: true },
        ],
        config: {
          condition: 'item.active === true',
        },
      });

      const result = await filterNode.runner(input, context);

      expect(result.data.items).toHaveLength(2);
      expect(result.data.rejected).toHaveLength(0);
    });

    it('should handle string conditions', async () => {
      const input = createMockInput({
        data: [
          { name: 'hello' },
          { name: 'world' },
          { name: 'hello world' },
        ],
        config: {
          condition: 'item.name.includes("hello")',
        },
      });

      const result = await filterNode.runner(input, context);

      expect(result.data.items).toHaveLength(2);
    });

    it('should include count information', async () => {
      const input = createMockInput({
        data: [{ value: 5 }, { value: 15 }, { value: 25 }],
        config: {
          condition: 'item.value > 10',
        },
      });

      const result = await filterNode.runner(input, context);

      expect(result.data.count).toBe(2);
      expect(result.data.rejectedCount).toBe(1);
    });

    it('should use custom output key', async () => {
      const input = createMockInput({
        data: [{ value: 1 }, { value: 2 }],
        config: {
          condition: 'item.value > 0',
          outputKey: 'filtered',
        },
      });

      const result = await filterNode.runner(input, context);

      expect(result.data.filtered).toHaveLength(2);
    });
  });
});
