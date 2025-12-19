import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import {
  NodeRegistry,
  nodeRegistry,
  getNode,
  getAllNodes,
  getNodesByCategory,
  registerNode,
  getAllNodeMetadata,
} from '../../src/registry';
import { registerAllNodes } from '../../src/index';
import type { NodeDefinition } from '@ws-flows/shared';

// Register all nodes before running tests on global registry
beforeAll(() => {
  registerAllNodes();
});

// Helper to create a test node
function createTestNode(type: string, category = 'test'): NodeDefinition {
  return {
    type,
    category: category as any,
    name: `Test ${type}`,
    description: 'Test node',
    icon: 'Test',
    version: '1.0.0',
    inputs: [],
    outputs: [],
    runner: async (input) => ({ data: input.data }),
  };
}

describe('Node Registry', () => {
  describe('NodeRegistry Class', () => {
    let registry: NodeRegistry;

    beforeEach(() => {
      registry = new NodeRegistry();
    });

    it('should register a node', () => {
      const node = createTestNode('test.node1');
      registry.register(node);

      const retrieved = registry.get('test.node1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.type).toBe('test.node1');
    });

    it('should register multiple nodes', () => {
      const nodes = [
        createTestNode('test.node1'),
        createTestNode('test.node2'),
        createTestNode('test.node3'),
      ];

      registry.registerMany(nodes);

      expect(registry.get('test.node1')).toBeDefined();
      expect(registry.get('test.node2')).toBeDefined();
      expect(registry.get('test.node3')).toBeDefined();
    });

    it('should get all nodes', () => {
      registry.register(createTestNode('test.a'));
      registry.register(createTestNode('test.b'));

      const all = registry.getAll();
      expect(all.length).toBeGreaterThanOrEqual(2);
    });

    it('should get nodes by category', () => {
      registry.register(createTestNode('cat1.node1', 'trigger'));
      registry.register(createTestNode('cat1.node2', 'trigger'));
      registry.register(createTestNode('cat2.node1', 'transform'));

      const triggers = registry.getByCategory('trigger');
      const transforms = registry.getByCategory('transform');

      expect(triggers.length).toBeGreaterThanOrEqual(2);
      expect(transforms.length).toBeGreaterThanOrEqual(1);
    });

    it('should return undefined for unknown node', () => {
      const node = registry.get('unknown.node');
      expect(node).toBeUndefined();
    });

    it('should return empty array for unknown category', () => {
      const nodes = registry.getByCategory('nonexistent' as any);
      expect(nodes).toEqual([]);
    });

    it('should check if node exists', () => {
      registry.register(createTestNode('exists.node'));

      expect(registry.has('exists.node')).toBe(true);
      expect(registry.has('missing.node')).toBe(false);
    });

    it('should get node metadata', () => {
      const node = createTestNode('meta.test');
      registry.register(node);

      const metadata = registry.getMetadata('meta.test');

      expect(metadata).toBeDefined();
      expect(metadata?.type).toBe('meta.test');
      expect(metadata?.name).toBe('Test meta.test');
    });

    it('should get all metadata', () => {
      registry.register(createTestNode('meta1'));
      registry.register(createTestNode('meta2'));

      const allMeta = registry.getAllMetadata();

      expect(allMeta.length).toBeGreaterThanOrEqual(2);
      expect(allMeta[0]).not.toHaveProperty('runner');
    });
  });

  describe('Global Registry Functions', () => {
    it('should access global registry via getNode', () => {
      // The global registry is pre-populated with all nodes
      const node = getNode('http.request');
      expect(node).toBeDefined();
      expect(node?.type).toBe('http.request');
    });

    it('should access global registry via getAllNodes', () => {
      const nodes = getAllNodes();
      expect(nodes.length).toBeGreaterThan(0);
    });

    it('should access nodes by category', () => {
      const triggers = getNodesByCategory('trigger');
      expect(triggers.length).toBeGreaterThan(0);
      triggers.forEach(node => {
        expect(node.category).toBe('trigger');
      });
    });

    it('should get all node metadata', () => {
      const metadata = getAllNodeMetadata();
      expect(metadata.length).toBeGreaterThan(0);
      metadata.forEach(meta => {
        expect(meta.type).toBeDefined();
        expect(meta.name).toBeDefined();
      });
    });
  });

  describe('Node Counts', () => {
    it('should have trigger nodes', () => {
      const triggers = getNodesByCategory('trigger');
      expect(triggers.length).toBeGreaterThan(0);
    });

    it('should have transform nodes', () => {
      const transforms = getNodesByCategory('transform');
      expect(transforms.length).toBeGreaterThan(0);
    });

    it('should have logic nodes', () => {
      const logic = getNodesByCategory('logic');
      expect(logic.length).toBeGreaterThan(0);
    });

    it('should have utility nodes', () => {
      const utils = getNodesByCategory('utility');
      expect(utils.length).toBeGreaterThan(0);
    });

    it('should have http nodes', () => {
      const http = getNodesByCategory('http');
      expect(http.length).toBeGreaterThan(0);
    });
  });
});
