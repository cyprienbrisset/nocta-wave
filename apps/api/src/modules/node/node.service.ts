import { Injectable } from '@nestjs/common';
import type { NodeDefinition } from '@ws-flows/shared';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const nodesModule = require('@ws-flows/nodes') as {
  allNodes: NodeDefinition[];
  getNodesByCategories: () => Record<string, NodeDefinition[]>;
  getNode: (type: string) => NodeDefinition | undefined;
  getAllNodeMetadata: () => Array<{
    type: string;
    category: string;
    name: string;
    description: string;
    icon: string;
    version: string;
    credentials?: string[];
  }>;
  NODE_COUNTS: Record<string, number>;
};

const { allNodes, getNodesByCategories, getNode, getAllNodeMetadata, NODE_COUNTS } = nodesModule;

@Injectable()
export class NodeService {
  /**
   * Get all available nodes metadata
   */
  getAll() {
    return getAllNodeMetadata();
  }

  /**
   * Get nodes grouped by category
   */
  getByCategory() {
    const categories = getNodesByCategories();

    return Object.entries(categories).map(([category, nodes]) => ({
      category,
      count: nodes.length,
      nodes: nodes.map((node) => ({
        type: node.type,
        name: node.name,
        description: node.description,
        icon: node.icon,
        credentials: node.credentials,
      })),
    }));
  }

  /**
   * Get a single node definition
   */
  getByType(type: string) {
    const node = getNode(type);

    if (!node) {
      return null;
    }

    return {
      type: node.type,
      category: node.category,
      name: node.name,
      description: node.description,
      icon: node.icon,
      version: node.version,
      inputs: node.inputs,
      outputs: node.outputs,
      credentials: node.credentials,
      defaults: node.defaults,
    };
  }

  /**
   * Get node counts
   */
  getCounts() {
    return NODE_COUNTS;
  }

  /**
   * Search nodes by name or description
   */
  search(query: string) {
    const searchLower = query.toLowerCase();

    return allNodes
      .filter(
        (node) =>
          node.name.toLowerCase().includes(searchLower) ||
          node.description.toLowerCase().includes(searchLower) ||
          node.type.toLowerCase().includes(searchLower),
      )
      .map((node) => ({
        type: node.type,
        category: node.category,
        name: node.name,
        description: node.description,
        icon: node.icon,
      }));
  }
}
