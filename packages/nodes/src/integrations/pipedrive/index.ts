import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const PipedriveNodeSchema = z.object({
  resource: z.enum(['deals', 'persons', 'organizations', 'activities', 'leads', 'products', 'notes', 'pipelines', 'stages']).default('deals'),
  operation: z.enum(['create', 'update', 'get', 'delete', 'list', 'search']).default('list'),
  resourceId: z.number().optional(),
  data: z.record(z.unknown()).optional(),
  searchTerm: z.string().optional(),
  filterByPipeline: z.number().optional(),
  filterByStage: z.number().optional(),
  filterByStatus: z.enum(['open', 'won', 'lost', 'all']).default('all'),
  start: z.number().min(0).default(0),
  limit: z.number().min(1).max(500).default(50),
  credentialId: z.string().optional(),
});

export type PipedriveNodeConfig = z.infer<typeof PipedriveNodeSchema>;

export const pipedriveNode: NodeDefinition = createNode(
  {
    type: 'integration.pipedrive',
    category: 'integration',
    name: 'Pipedrive',
    description: 'Sales CRM - Deals, persons, organizations, activities',
    icon: 'TrendingUp',
    inputs: [
      input.select(
        'resource',
        'Resource',
        [
          { label: 'Deals', value: 'deals' },
          { label: 'Persons', value: 'persons' },
          { label: 'Organizations', value: 'organizations' },
          { label: 'Activities', value: 'activities' },
          { label: 'Leads', value: 'leads' },
          { label: 'Products', value: 'products' },
          { label: 'Notes', value: 'notes' },
          { label: 'Pipelines', value: 'pipelines' },
          { label: 'Stages', value: 'stages' },
        ],
        { default: 'deals' }
      ),
      input.select(
        'operation',
        'Operation',
        [
          { label: 'List', value: 'list' },
          { label: 'Get', value: 'get' },
          { label: 'Create', value: 'create' },
          { label: 'Update', value: 'update' },
          { label: 'Delete', value: 'delete' },
          { label: 'Search', value: 'search' },
        ],
        { default: 'list' }
      ),
      input.number('resourceId', 'Resource ID', {
        description: 'ID of the resource',
      }),
      input.json('data', 'Data', {
        description: 'Resource data for create/update',
        default: {},
      }),
      input.string('searchTerm', 'Search Term', {
        description: 'Term to search for',
        placeholder: 'Search...',
      }),
      input.number('filterByPipeline', 'Pipeline ID', {
        description: 'Filter deals by pipeline',
      }),
      input.number('filterByStage', 'Stage ID', {
        description: 'Filter deals by stage',
      }),
      input.select(
        'filterByStatus',
        'Deal Status',
        [
          { label: 'All', value: 'all' },
          { label: 'Open', value: 'open' },
          { label: 'Won', value: 'won' },
          { label: 'Lost', value: 'lost' },
        ],
        { default: 'all' }
      ),
      input.number('start', 'Offset', {
        description: 'Pagination offset',
        default: 0,
        min: 0,
      }),
      input.number('limit', 'Limit', {
        description: 'Maximum results',
        default: 50,
        min: 1,
        max: 500,
      }),
      input.credential('credentialId', 'Pipedrive Credentials', {
        description: 'Pipedrive API token',
        credentialTypes: ['API_KEY'],
        required: true,
      }),
    ],
    outputs: [output.main({ description: 'API operation result' })],
    defaults: {
      resource: 'deals',
      operation: 'list',
      filterByStatus: 'all',
      start: 0,
      limit: 50,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = PipedriveNodeSchema.parse(nodeInput.config);

    logger.info(`Pipedrive ${config.operation} on ${config.resource}`);

    switch (config.operation) {
      case 'list':
        return {
          data: {
            success: true,
            items: [
              {
                id: 1,
                title: 'Big Deal',
                value: 50000,
                currency: 'USD',
                status: 'open',
                stage_id: 1,
                pipeline_id: 1,
                person_id: 1,
                org_id: 1,
              },
              {
                id: 2,
                title: 'Medium Deal',
                value: 25000,
                currency: 'USD',
                status: 'open',
                stage_id: 2,
                pipeline_id: 1,
              },
            ],
            moreItems: true,
          },
        };

      case 'get':
        return {
          data: {
            success: true,
            item: {
              id: config.resourceId,
              title: 'Big Deal',
              value: 50000,
              currency: 'USD',
              status: 'open',
              add_time: new Date().toISOString(),
              update_time: new Date().toISOString(),
            },
          },
        };

      case 'create':
        return {
          data: {
            success: true,
            id: Date.now(),
            item: {
              id: Date.now(),
              ...config.data,
              add_time: new Date().toISOString(),
            },
          },
        };

      case 'update':
        return {
          data: {
            success: true,
            id: config.resourceId,
            item: {
              id: config.resourceId,
              ...config.data,
              update_time: new Date().toISOString(),
            },
          },
        };

      case 'delete':
        return {
          data: {
            success: true,
            id: config.resourceId,
            deleted: true,
          },
        };

      case 'search':
        return {
          data: {
            success: true,
            items: [
              {
                id: 1,
                title: 'Big Deal',
                result_score: 0.95,
              },
            ],
            moreItems: false,
          },
        };

      default:
        return { data: { success: false, error: 'Unknown operation' } };
    }
  }
);
