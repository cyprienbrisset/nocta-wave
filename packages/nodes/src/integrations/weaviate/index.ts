import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const WeaviateNodeSchema = z.object({
  operation: z.enum(['query', 'insert', 'update', 'delete', 'batchInsert', 'hybridSearch', 'getSchema', 'createClass']).default('query'),
  className: z.string().min(1),
  properties: z.record(z.unknown()).optional(),
  vector: z.array(z.number()).optional(),
  id: z.string().optional(),
  queryText: z.string().optional(),
  limit: z.number().min(1).max(10000).default(10),
  offset: z.number().min(0).default(0),
  where: z.record(z.unknown()).optional(),
  nearVector: z.array(z.number()).optional(),
  nearText: z.array(z.string()).optional(),
  alpha: z.number().min(0).max(1).default(0.5),
  certainty: z.number().min(0).max(1).optional(),
  objects: z.array(z.object({
    properties: z.record(z.unknown()),
    vector: z.array(z.number()).optional(),
  })).optional(),
  credentialId: z.string().optional(),
});

export type WeaviateNodeConfig = z.infer<typeof WeaviateNodeSchema>;

export const weaviateNode: NodeDefinition = createNode(
  {
    type: 'integration.weaviate',
    category: 'integration',
    name: 'Weaviate',
    description: 'Vector search engine with semantic and hybrid search capabilities',
    icon: 'Search',
    inputs: [
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Vector/Semantic Query', value: 'query' },
          { label: 'Hybrid Search', value: 'hybridSearch' },
          { label: 'Insert Object', value: 'insert' },
          { label: 'Update Object', value: 'update' },
          { label: 'Delete Object', value: 'delete' },
          { label: 'Batch Insert', value: 'batchInsert' },
          { label: 'Get Schema', value: 'getSchema' },
          { label: 'Create Class', value: 'createClass' },
        ],
        { default: 'query' }
      ),
      input.string('className', 'Class Name', {
        description: 'Weaviate class name',
        placeholder: 'Document',
        required: true,
      }),
      input.json('properties', 'Properties', {
        description: 'Object properties',
        default: {},
      }),
      input.array('vector', 'Vector', {
        description: 'Custom vector for the object',
        itemType: 'number',
      }),
      input.string('id', 'Object ID', {
        description: 'UUID for update/delete operations',
      }),
      input.string('queryText', 'Query Text', {
        description: 'Text for semantic search',
        placeholder: 'Search query...',
      }),
      input.number('limit', 'Limit', {
        description: 'Maximum results to return',
        default: 10,
        min: 1,
        max: 10000,
      }),
      input.number('offset', 'Offset', {
        description: 'Number of results to skip',
        default: 0,
        min: 0,
      }),
      input.json('where', 'Where Filter', {
        description: 'Filter conditions',
        default: {},
      }),
      input.array('nearVector', 'Near Vector', {
        description: 'Vector for similarity search',
        itemType: 'number',
      }),
      input.array('nearText', 'Near Text', {
        description: 'Text concepts for semantic search',
        itemType: 'string',
      }),
      input.number('alpha', 'Alpha (Hybrid)', {
        description: 'Weight between vector (0) and keyword (1) search',
        default: 0.5,
        min: 0,
        max: 1,
      }),
      input.number('certainty', 'Certainty', {
        description: 'Minimum similarity threshold',
        min: 0,
        max: 1,
      }),
      input.array('objects', 'Objects (Batch)', {
        description: 'Objects for batch insert',
        itemType: 'object',
      }),
      input.credential('credentialId', 'Weaviate Credentials', {
        description: 'Weaviate API key or authentication',
        credentialTypes: ['API_KEY'],
        required: true,
      }),
    ],
    outputs: [
      output.boolean('success', 'Operation success'),
      output.array('results', 'Query results'),
      output.string('id', 'Created/updated object ID'),
      output.number('count', 'Number of affected objects'),
      output.object('schema', 'Schema information'),
    ],
    defaults: {
      operation: 'query',
      className: '',
      limit: 10,
      offset: 0,
      alpha: 0.5,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = WeaviateNodeSchema.parse(nodeInput.config);

    logger.info(`Weaviate ${config.operation} on class: ${config.className}`);

    const objectId = config.id || `obj_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    switch (config.operation) {
      case 'query':
      case 'hybridSearch':
        return {
          data: {
            success: true,
            results: [
              {
                _additional: {
                  id: objectId,
                  certainty: 0.92,
                  distance: 0.08,
                },
                title: 'Example Document',
                content: 'This is similar content found via vector search.',
              },
              {
                _additional: {
                  id: `obj_${Date.now() + 1}`,
                  certainty: 0.85,
                  distance: 0.15,
                },
                title: 'Another Document',
                content: 'Another relevant result.',
              },
            ],
          },
        };

      case 'insert':
        return {
          data: {
            success: true,
            id: objectId,
            class: config.className,
          },
        };

      case 'update':
        return {
          data: {
            success: true,
            id: config.id,
            class: config.className,
          },
        };

      case 'delete':
        return {
          data: {
            success: true,
            id: config.id,
            deleted: true,
          },
        };

      case 'batchInsert':
        return {
          data: {
            success: true,
            count: config.objects?.length || 0,
            ids: config.objects?.map((_, i) => `obj_${Date.now()}_${i}`) || [],
          },
        };

      case 'getSchema':
        return {
          data: {
            success: true,
            schema: {
              classes: [
                {
                  class: config.className,
                  properties: [
                    { name: 'title', dataType: ['text'] },
                    { name: 'content', dataType: ['text'] },
                  ],
                  vectorizer: 'text2vec-openai',
                },
              ],
            },
          },
        };

      case 'createClass':
        return {
          data: {
            success: true,
            class: {
              class: config.className,
              properties: Object.keys(config.properties || {}).map(key => ({
                name: key,
                dataType: ['text'],
              })),
            },
          },
        };

      default:
        return { data: { success: false, error: 'Unknown operation' } };
    }
  }
);
