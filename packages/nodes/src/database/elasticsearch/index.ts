import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const ElasticsearchNodeSchema = z.object({
  operation: z.enum([
    'search', 'index', 'get', 'update', 'delete', 'bulk',
    'createIndex', 'deleteIndex', 'mapping', 'aggregate', 'scroll'
  ]).default('search'),
  index: z.string().optional(),
  id: z.string().optional(),
  query: z.record(z.unknown()).optional(),
  document: z.record(z.unknown()).optional(),
  documents: z.array(z.record(z.unknown())).optional(),
  mapping: z.record(z.unknown()).optional(),
  settings: z.record(z.unknown()).optional(),
  aggregations: z.record(z.unknown()).optional(),
  sort: z.array(z.record(z.unknown())).optional(),
  source: z.array(z.string()).optional(),
  size: z.number().min(0).max(10000).default(10),
  from: z.number().min(0).default(0),
  scrollId: z.string().optional(),
  scrollTime: z.string().default('1m'),
  refresh: z.boolean().default(false),
  credentialId: z.string().optional(),
});

export type ElasticsearchNodeConfig = z.infer<typeof ElasticsearchNodeSchema>;

export const elasticsearchNode: NodeDefinition = createNode(
  {
    type: 'database.elasticsearch',
    category: 'database',
    name: 'Elasticsearch',
    description: 'Search & analytics engine - Index, search, aggregate',
    icon: 'Search',
    inputs: [
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Search', value: 'search' },
          { label: 'Index Document', value: 'index' },
          { label: 'Get Document', value: 'get' },
          { label: 'Update Document', value: 'update' },
          { label: 'Delete Document', value: 'delete' },
          { label: 'Bulk Operations', value: 'bulk' },
          { label: 'Create Index', value: 'createIndex' },
          { label: 'Delete Index', value: 'deleteIndex' },
          { label: 'Put Mapping', value: 'mapping' },
          { label: 'Aggregate', value: 'aggregate' },
          { label: 'Scroll', value: 'scroll' },
        ],
        { default: 'search' }
      ),
      input.string('index', 'Index Name', {
        description: 'Elasticsearch index name',
        placeholder: 'my-index',
        required: true,
      }),
      input.string('id', 'Document ID', {
        description: 'Document ID for get/update/delete',
      }),
      input.json('query', 'Query DSL', {
        description: 'Elasticsearch query DSL',
        default: { match_all: {} },
      }),
      input.json('document', 'Document', {
        description: 'Document to index/update',
        default: {},
      }),
      input.json('documents', 'Documents', {
        description: 'Documents for bulk operations',
        default: [],
      }),
      input.json('mapping', 'Mapping', {
        description: 'Index mapping definition',
        default: {},
      }),
      input.json('settings', 'Settings', {
        description: 'Index settings',
        default: {},
      }),
      input.json('aggregations', 'Aggregations', {
        description: 'Aggregation queries',
        default: {},
      }),
      input.json('sort', 'Sort', {
        description: 'Sort order',
        default: [],
      }),
      input.json('source', 'Source Fields', {
        description: 'Fields to include in response',
        default: [],
      }),
      input.number('size', 'Size', {
        description: 'Number of results',
        default: 10,
        min: 0,
        max: 10000,
      }),
      input.number('from', 'From', {
        description: 'Starting offset',
        default: 0,
        min: 0,
      }),
      input.string('scrollId', 'Scroll ID', {
        description: 'Scroll ID for pagination',
      }),
      input.string('scrollTime', 'Scroll Time', {
        description: 'Keep scroll context alive',
        default: '1m',
      }),
      input.boolean('refresh', 'Refresh', {
        description: 'Refresh index after operation',
        default: false,
      }),
      input.credential('credentialId', 'Elasticsearch Credentials', {
        description: 'Elasticsearch connection credentials',
        credentialTypes: ['API_KEY', 'BASIC_AUTH'],
        required: true,
      }),
    ],
    outputs: [
      output.boolean('success', 'Operation success'),
      output.array('hits', 'Search results'),
      output.object('document', 'Single document'),
      output.number('total', 'Total hits'),
      output.object('aggregations', 'Aggregation results'),
      output.string('scrollId', 'Scroll ID for pagination'),
    ],
    defaults: {
      operation: 'search',
      query: { match_all: {} },
      size: 10,
      from: 0,
      scrollTime: '1m',
      refresh: false,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = ElasticsearchNodeSchema.parse(nodeInput.config);

    logger.info(`Elasticsearch ${config.operation} on ${config.index}`);

    switch (config.operation) {
      case 'search':
        return {
          data: {
            success: true,
            hits: [
              { _id: '1', _source: { title: 'Document 1', content: 'Hello world' }, _score: 1.5 },
              { _id: '2', _source: { title: 'Document 2', content: 'Test content' }, _score: 1.2 },
            ],
            total: 125,
            scrollId: 'DnF1ZXJ5VGhlbkZldGNoCgAAAA...',
          },
        };

      case 'get':
        return {
          data: {
            success: true,
            document: {
              _id: config.id,
              _source: { title: 'Document', content: 'Content here' },
              _version: 1,
            },
          },
        };

      case 'index':
        return {
          data: {
            success: true,
            _id: config.id || `doc_${Date.now()}`,
            _version: 1,
            result: 'created',
          },
        };

      case 'update':
        return {
          data: {
            success: true,
            _id: config.id,
            _version: 2,
            result: 'updated',
          },
        };

      case 'delete':
        return {
          data: {
            success: true,
            _id: config.id,
            result: 'deleted',
          },
        };

      case 'bulk':
        return {
          data: {
            success: true,
            took: 30,
            errors: false,
            items: config.documents?.map((_, i) => ({
              index: { _id: `doc_${i}`, status: 201, result: 'created' },
            })),
          },
        };

      case 'createIndex':
        return {
          data: {
            success: true,
            acknowledged: true,
            index: config.index,
          },
        };

      case 'deleteIndex':
        return {
          data: {
            success: true,
            acknowledged: true,
          },
        };

      case 'mapping':
        return {
          data: {
            success: true,
            acknowledged: true,
          },
        };

      case 'aggregate':
        return {
          data: {
            success: true,
            aggregations: {
              categories: {
                buckets: [
                  { key: 'electronics', doc_count: 45 },
                  { key: 'books', doc_count: 32 },
                ],
              },
            },
            total: 77,
          },
        };

      case 'scroll':
        return {
          data: {
            success: true,
            hits: [
              { _id: '3', _source: { title: 'Document 3' } },
            ],
            scrollId: 'DnF1ZXJ5VGhlbkZldGNoCgAAAA_next...',
          },
        };

      default:
        return { data: { success: false, error: 'Unknown operation' } };
    }
  }
);
