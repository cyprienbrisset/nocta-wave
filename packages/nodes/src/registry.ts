import type { NodeDefinition, NodeMetadata, NodeCategory } from '@ws-flows/shared';

/**
 * Node Registry - Central registry for all node definitions
 */
export class NodeRegistry {
  private static instance: NodeRegistry;
  private nodes: Map<string, NodeDefinition> = new Map();

  private constructor() {}

  /**
   * Get the singleton instance
   */
  static getInstance(): NodeRegistry {
    if (!NodeRegistry.instance) {
      NodeRegistry.instance = new NodeRegistry();
    }
    return NodeRegistry.instance;
  }

  /**
   * Register a node definition
   */
  register(node: NodeDefinition): void {
    if (this.nodes.has(node.type)) {
      console.warn(`Node type "${node.type}" is already registered. Overwriting.`);
    }
    this.nodes.set(node.type, node);
  }

  /**
   * Register multiple node definitions
   */
  registerMany(nodes: NodeDefinition[]): void {
    for (const node of nodes) {
      this.register(node);
    }
  }

  /**
   * Get a node definition by type
   */
  get(type: string): NodeDefinition | undefined {
    return this.nodes.get(type);
  }

  /**
   * Check if a node type exists
   */
  has(type: string): boolean {
    return this.nodes.has(type);
  }

  /**
   * Get all node definitions
   */
  getAll(): NodeDefinition[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get all node types
   */
  getTypes(): string[] {
    return Array.from(this.nodes.keys());
  }

  /**
   * Get nodes by category
   */
  getByCategory(category: NodeCategory): NodeDefinition[] {
    return this.getAll().filter((node) => node.category === category);
  }

  /**
   * Get node metadata (without runner)
   */
  getMetadata(type: string): NodeMetadata | undefined {
    const node = this.nodes.get(type);
    if (!node) return undefined;

    return {
      type: node.type,
      category: node.category,
      name: node.name,
      description: node.description,
      icon: node.icon,
      version: node.version,
      credentials: node.credentials,
    };
  }

  /**
   * Get all node metadata
   */
  getAllMetadata(): NodeMetadata[] {
    return this.getAll().map((node) => ({
      type: node.type,
      category: node.category,
      name: node.name,
      description: node.description,
      icon: node.icon,
      version: node.version,
      credentials: node.credentials,
    }));
  }

  /**
   * Unregister a node
   */
  unregister(type: string): boolean {
    return this.nodes.delete(type);
  }

  /**
   * Clear all nodes
   */
  clear(): void {
    this.nodes.clear();
  }

  /**
   * Get node count
   */
  get count(): number {
    return this.nodes.size;
  }
}

// Export singleton instance
export const nodeRegistry = NodeRegistry.getInstance();

// Helper functions
export function registerNode(node: NodeDefinition): void {
  nodeRegistry.register(node);
}

export function registerNodes(nodes: NodeDefinition[]): void {
  nodeRegistry.registerMany(nodes);
}

export function getNode(type: string): NodeDefinition | undefined {
  return nodeRegistry.get(type);
}

export function getAllNodes(): NodeDefinition[] {
  return nodeRegistry.getAll();
}

export function getNodesByCategory(category: NodeCategory): NodeDefinition[] {
  return nodeRegistry.getByCategory(category);
}

export function getNodeMetadata(type: string): NodeMetadata | undefined {
  return nodeRegistry.getMetadata(type);
}

export function getAllNodeMetadata(): NodeMetadata[] {
  return nodeRegistry.getAllMetadata();
}
