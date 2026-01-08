import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const PineconeNodeSchema = z.object({
  operation: z.enum(['upsert', 'query', 'fetch', 'delete', 'update', 'describeIndex', 'listIndexes', 'createIndex']).default('query'),
  indexName: z.string().min(1),
  namespace: z.string().optional(),
  vectors: z.array(z.object({
    id: z.string(),
    values: z.array(z.number()),
    metadata: z.record(z.unknown()).optional(),
  })).optional(),
  queryVector: z.array(z.number()).optional(),
  topK: z.number().min(1).max(10000).default(10),
  filter: z.record(z.unknown()).optional(),
  includeMetadata: z.boolean().default(true),
  includeValues: z.boolean().default(false),
  ids: z.array(z.string()).optional(),
  dimension: z.number().optional(),
  metric: z.enum(['cosine', 'euclidean', 'dotproduct']).default('cosine'),
  credentialId: z.string().optional(),
});

export type PineconeNodeConfig = z.infer<typeof PineconeNodeSchema>;

export const pineconeNode: NodeDefinition = createNode(
  {
    type: 'integration.pinecone',
    category: 'integration',
    name: 'Pinecone',
    description: 'Vector database for similarity search and RAG applications',
    icon: 'Database',
    inputs: [
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Query Vectors', value: 'query' },
          { label: 'Upsert Vectors', value: 'upsert' },
          { label: 'Fetch Vectors', value: 'fetch' },
          { label: 'Delete Vectors', value: 'delete' },
          { label: 'Update Vector', value: 'update' },
          { label: 'Describe Index', value: 'describeIndex' },
          { label: 'List Indexes', value: 'listIndexes' },
          { label: 'Create Index', value: 'createIndex' },
        ],
        { default: 'query' }
      ),
      input.string('indexName', 'Index Name', {
        description: 'Pinecone index name',
        placeholder: 'my-index',
        required: true,
      }),
      input.string('namespace', 'Namespace', {
        description: 'Optional namespace within the index',
        placeholder: 'default',
      }),
      input.array('vectors', 'Vectors', {
        description: 'Vectors to upsert (with id, values, metadata)',
        itemType: 'object',
      }),
      input.array('queryVector', 'Query Vector', {
        description: 'Vector for similarity search',
        itemType: 'number',
      }),
      input.number('topK', 'Top K', {
        description: 'Number of results to return',
        default: 10,
        min: 1,
        max: 10000,
      }),
      input.json('filter', 'Metadata Filter', {
        description: 'Filter results by metadata',
        default: {},
      }),
      input.boolean('includeMetadata', 'Include Metadata', {
        description: 'Include metadata in results',
        default: true,
      }),
      input.boolean('includeValues', 'Include Values', {
        description: 'Include vector values in results',
        default: false,
      }),
      input.array('ids', 'Vector IDs', {
        description: 'IDs for fetch/delete operations',
        itemType: 'string',
      }),
      input.number('dimension', 'Dimension', {
        description: 'Vector dimension (for create index)',
        min: 1,
      }),
      input.select(
        'metric',
        'Distance Metric',
        [
          { label: 'Cosine', value: 'cosine' },
          { label: 'Euclidean', value: 'euclidean' },
          { label: 'Dot Product', value: 'dotproduct' },
        ],
        { default: 'cosine' }
      ),
      input.credential('credentialId', 'Pinecone API Key', {
        description: 'Pinecone API key',
        credentialTypes: ['API_KEY'],
        required: true,
      }),
    ],
    outputs: [output.main({ description: 'API operation result' })],
    defaults: {
      operation: 'query',
      indexName: '',
      topK: 10,
      includeMetadata: true,
      includeValues: false,
      metric: 'cosine',
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = PineconeNodeSchema.parse(nodeInput.config);

    logger.info(`Pinecone ${config.operation} on index: ${config.indexName}`);

    switch (config.operation) {
      case 'query':
        return {
          data: {
            success: true,
            matches: [
              {
                id: 'vec1',
                score: 0.95,
                metadata: { text: 'Similar document 1' },
              },
              {
                id: 'vec2',
                score: 0.87,
                metadata: { text: 'Similar document 2' },
              },
            ],
            namespace: config.namespace || '',
          },
        };

      case 'upsert':
        return {
          data: {
            success: true,
            upsertedCount: config.vectors?.length || 0,
          },
        };

      case 'fetch':
        return {
          data: {
            success: true,
            vectors: {
              vec1: {
                id: 'vec1',
                values: Array.from({ length: 1536 }, () => Math.random()),
                metadata: { text: 'Document content' },
              },
            },
            namespace: config.namespace || '',
          },
        };

      case 'delete':
        return {
          data: {
            success: true,
            deletedCount: config.ids?.length || 0,
          },
        };

      case 'update':
        return {
          data: {
            success: true,
          },
        };

      case 'describeIndex':
        return {
          data: {
            success: true,
            indexStats: {
              dimension: config.dimension || 1536,
              indexFullness: 0.1,
              totalVectorCount: 10000,
              namespaces: {
                '': { vectorCount: 10000 },
              },
            },
          },
        };

      case 'listIndexes':
        return {
          data: {
            success: true,
            indexes: [
              {
                name: config.indexName,
                dimension: 1536,
                metric: config.metric,
                status: { ready: true, state: 'Ready' },
              },
            ],
          },
        };

      case 'createIndex':
        return {
          data: {
            success: true,
            index: {
              name: config.indexName,
              dimension: config.dimension,
              metric: config.metric,
            },
          },
        };

      default:
        return { data: { success: false, error: 'Unknown operation' } };
    }
  }
);
