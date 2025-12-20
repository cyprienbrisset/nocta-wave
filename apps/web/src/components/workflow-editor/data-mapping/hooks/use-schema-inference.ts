'use client';

import { useCallback, useMemo } from 'react';
import { useWorkflowStore } from '@/stores/workflow.store';
import type { FieldSchema, DataType, NodeDataSchema } from '@/types/mapping.types';
import { inferDataType } from '@/types/mapping.types';

/**
 * Hook for inferring data schemas from runtime node data
 */
export function useSchemaInference() {
  const { debug, nodes, setNodeSchema, mapping } = useWorkflowStore();

  /**
   * Recursively infer schema from a value
   */
  const inferSchemaFromValue = useCallback(
    (value: unknown, basePath: string, name: string, depth = 0): FieldSchema => {
      const type = inferDataType(value);

      // Base case: null or undefined
      if (value === null || value === undefined) {
        return {
          path: basePath,
          name,
          type: type as DataType,
          isArray: false,
          sampleValue: value,
        };
      }

      // Array case
      if (Array.isArray(value)) {
        const children: FieldSchema[] = [];

        // Infer schema from first item if exists
        if (value.length > 0 && depth < 5) {
          const firstItem = value[0];
          if (typeof firstItem === 'object' && firstItem !== null) {
            // For arrays of objects, get schema from first object
            Object.entries(firstItem).forEach(([key, val]) => {
              children.push(
                inferSchemaFromValue(val, `${basePath}[].${key}`, key, depth + 1)
              );
            });
          }
        }

        return {
          path: basePath,
          name,
          type: 'array',
          isArray: true,
          arrayItemType: value.length > 0 ? inferDataType(value[0]) : 'unknown',
          children: children.length > 0 ? children : undefined,
          sampleValue: value.slice(0, 3), // Keep first 3 items as sample
        };
      }

      // Object case
      if (typeof value === 'object') {
        const children: FieldSchema[] = [];

        if (depth < 5) {
          Object.entries(value).forEach(([key, val]) => {
            children.push(
              inferSchemaFromValue(val, `${basePath}.${key}`, key, depth + 1)
            );
          });
        }

        return {
          path: basePath,
          name,
          type: 'object',
          isArray: false,
          children: children.length > 0 ? children : undefined,
          sampleValue: depth < 2 ? value : undefined, // Only keep sample at shallow depth
        };
      }

      // Primitive case
      return {
        path: basePath,
        name,
        type,
        isArray: false,
        sampleValue: value,
      };
    },
    []
  );

  /**
   * Infer complete schema for a node's output
   */
  const inferNodeOutputSchema = useCallback(
    (nodeId: string): FieldSchema[] => {
      const nodeData = debug.nodeData[nodeId];
      const node = nodes.find((n) => n.id === nodeId);

      // If we have runtime data, use it
      if (nodeData?.output) {
        const output = nodeData.output;

        if (typeof output !== 'object' || output === null) {
          // Single value output
          return [inferSchemaFromValue(output, 'output', 'output', 0)];
        }

        // Object output - create schema for each top-level key
        return Object.entries(output).map(([key, value]) =>
          inferSchemaFromValue(value, `output.${key}`, key, 0)
        );
      }

      // Fallback to node definition outputs
      if (node?.data?.outputs && Array.isArray(node.data.outputs)) {
        return node.data.outputs.map((output: { name: string; type?: string; description?: string }) => ({
          path: `output.${output.name}`,
          name: output.name,
          type: (output.type as DataType) || 'unknown',
          isArray: output.type === 'array',
          description: output.description,
          sampleValue: undefined,
        }));
      }

      // Fallback to config values as a hint for expected structure
      if (node?.data?.config) {
        const configEntries = Object.entries(node.data.config)
          .filter(([key]) => key.startsWith('output') || key === 'result');
        if (configEntries.length > 0) {
          return configEntries.map(([key, value]) =>
            inferSchemaFromValue(value, `output.${key}`, key, 0)
          );
        }
      }

      // Default: single output field
      return [{
        path: 'output',
        name: 'output',
        type: 'object',
        isArray: false,
        description: 'Node output (execute workflow to see actual data)',
      }];
    },
    [debug.nodeData, nodes, inferSchemaFromValue]
  );

  /**
   * Infer schema for a node's input (from config definition)
   */
  const inferNodeInputSchema = useCallback(
    (nodeId: string): FieldSchema[] => {
      const node = nodes.find((n) => n.id === nodeId);
      const nodeData = debug.nodeData[nodeId];

      // If we have runtime input data, use it
      if (nodeData?.input) {
        const input = nodeData.input;
        if (typeof input === 'object' && input !== null) {
          return Object.entries(input).map(([key, value]) =>
            inferSchemaFromValue(value, `config.${key}`, key, 0)
          );
        }
      }

      // Fallback to config definition
      if (node?.data?.config) {
        const config = node.data.config;
        const entries = Object.entries(config);
        if (entries.length > 0) {
          return entries.map(([key, value]) =>
            inferSchemaFromValue(value, `config.${key}`, key, 0)
          );
        }
      }

      // Default: config object
      return [{
        path: 'config',
        name: 'config',
        type: 'object',
        isArray: false,
        description: 'Node configuration',
      }];
    },
    [nodes, debug.nodeData, inferSchemaFromValue]
  );

  /**
   * Get or create schema for a node
   */
  const getNodeSchema = useCallback(
    (nodeId: string): NodeDataSchema | null => {
      // Check cache first
      const cached = mapping.schemas[nodeId];
      if (cached && Date.now() - cached.lastUpdated < 60000) {
        // Return cached if less than 1 minute old
        return cached;
      }

      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return null;

      const outputSchema = inferNodeOutputSchema(nodeId);
      const inputSchema = inferNodeInputSchema(nodeId);

      const schema: NodeDataSchema = {
        nodeId,
        nodeType: node.data.nodeType || 'unknown',
        outputSchema,
        inputSchema,
        lastUpdated: Date.now(),
        source: debug.nodeData[nodeId] ? 'runtime' : 'inferred',
      };

      // Cache the schema
      setNodeSchema(nodeId, schema);

      return schema;
    },
    [nodes, debug.nodeData, mapping.schemas, inferNodeOutputSchema, inferNodeInputSchema, setNodeSchema]
  );

  /**
   * Get flattened field list from schema (for autocomplete/suggestions)
   */
  const flattenSchema = useCallback(
    (fields: FieldSchema[], prefix = ''): FieldSchema[] => {
      const result: FieldSchema[] = [];

      fields.forEach((field) => {
        const fullPath = prefix ? `${prefix}.${field.name}` : field.path;
        result.push({ ...field, path: fullPath });

        if (field.children) {
          result.push(...flattenSchema(field.children, fullPath));
        }
      });

      return result;
    },
    []
  );

  /**
   * Find a field by path in a schema
   */
  const findFieldByPath = useCallback(
    (fields: FieldSchema[], path: string): FieldSchema | null => {
      const parts = path.split('.');
      let current: FieldSchema[] | undefined = fields;
      let found: FieldSchema | null = null;

      for (const part of parts) {
        if (!current) return null;

        // Handle array notation like "users[]"
        const cleanPart = part.replace(/\[\]$/, '');
        found = current.find((f) => f.name === cleanPart) || null;

        if (!found) return null;
        current = found.children;
      }

      return found;
    },
    []
  );

  return {
    inferNodeOutputSchema,
    inferNodeInputSchema,
    getNodeSchema,
    flattenSchema,
    findFieldByPath,
    inferSchemaFromValue,
  };
}

/**
 * Hook to get schema for source and target nodes of an edge
 */
export function useEdgeSchemas(edgeId: string | null) {
  const { edges, nodes } = useWorkflowStore();
  const { getNodeSchema } = useSchemaInference();

  return useMemo(() => {
    if (!edgeId) return { sourceSchema: null, targetSchema: null, sourceNode: null, targetNode: null };

    const edge = edges.find((e) => e.id === edgeId);
    if (!edge) return { sourceSchema: null, targetSchema: null, sourceNode: null, targetNode: null };

    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);

    const sourceSchema = getNodeSchema(edge.source);
    const targetSchema = getNodeSchema(edge.target);

    return { sourceSchema, targetSchema, sourceNode, targetNode };
  }, [edgeId, edges, nodes, getNodeSchema]);
}
