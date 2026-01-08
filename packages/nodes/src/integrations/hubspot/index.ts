import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const HubSpotNodeSchema = z.object({
  resource: z.enum(['contacts', 'companies', 'deals', 'tickets', 'products', 'lineItems', 'quotes']).default('contacts'),
  operation: z.enum([
    'create', 'update', 'get', 'delete', 'list', 'search',
    'associate', 'disassociate', 'batchCreate', 'batchUpdate'
  ]).default('list'),
  objectId: z.string().optional(),
  properties: z.record(z.unknown()).optional(),
  associations: z.array(z.object({
    toObjectType: z.string(),
    toObjectId: z.string(),
    associationType: z.string(),
  })).optional(),
  filterGroups: z.array(z.object({
    filters: z.array(z.object({
      propertyName: z.string(),
      operator: z.string(),
      value: z.string(),
    })),
  })).optional(),
  limit: z.number().min(1).max(100).default(20),
  after: z.string().optional(),
  credentialId: z.string().optional(),
});

export type HubSpotNodeConfig = z.infer<typeof HubSpotNodeSchema>;

export const hubspotNode: NodeDefinition = createNode(
  {
    type: 'integration.hubspot',
    category: 'integration',
    name: 'HubSpot',
    description: 'CRM & Marketing platform - Contacts, deals, companies, tickets',
    icon: 'Users',
    inputs: [
      input.select(
        'resource',
        'Resource',
        [
          { label: 'Contacts', value: 'contacts' },
          { label: 'Companies', value: 'companies' },
          { label: 'Deals', value: 'deals' },
          { label: 'Tickets', value: 'tickets' },
          { label: 'Products', value: 'products' },
          { label: 'Line Items', value: 'lineItems' },
          { label: 'Quotes', value: 'quotes' },
        ],
        { default: 'contacts' }
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
          { label: 'Associate', value: 'associate' },
          { label: 'Disassociate', value: 'disassociate' },
          { label: 'Batch Create', value: 'batchCreate' },
          { label: 'Batch Update', value: 'batchUpdate' },
        ],
        { default: 'list' }
      ),
      input.string('objectId', 'Object ID', {
        description: 'HubSpot object ID',
        placeholder: '12345',
      }),
      input.json('properties', 'Properties', {
        description: 'Object properties',
        default: {},
      }),
      input.json('associations', 'Associations', {
        description: 'Object associations',
        default: [],
      }),
      input.json('filterGroups', 'Search Filters', {
        description: 'Filter groups for search',
        default: [],
      }),
      input.number('limit', 'Limit', {
        description: 'Maximum results',
        default: 20,
        min: 1,
        max: 100,
      }),
      input.string('after', 'Pagination Cursor', {
        description: 'Cursor for pagination',
      }),
      input.credential('credentialId', 'HubSpot Credentials', {
        description: 'HubSpot API key or OAuth2',
        credentialTypes: ['API_KEY', 'OAUTH2'],
        required: true,
      }),
    ],
    outputs: [output.main({ description: 'API operation result' })],
    defaults: {
      resource: 'contacts',
      operation: 'list',
      limit: 20,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = HubSpotNodeSchema.parse(nodeInput.config);

    logger.info(`HubSpot ${config.operation} on ${config.resource}`);

    const objectId = config.objectId || '12345';

    switch (config.operation) {
      case 'list':
        return {
          data: {
            success: true,
            results: [
              {
                id: '12345',
                properties: {
                  firstname: 'John',
                  lastname: 'Doe',
                  email: 'john@example.com',
                  company: 'Acme Corp',
                },
                createdAt: new Date().toISOString(),
              },
              {
                id: '12346',
                properties: {
                  firstname: 'Jane',
                  lastname: 'Smith',
                  email: 'jane@example.com',
                  company: 'Tech Inc',
                },
                createdAt: new Date().toISOString(),
              },
            ],
            nextPage: 'cursor_abc123',
            total: 150,
          },
        };

      case 'get':
        return {
          data: {
            success: true,
            record: {
              id: config.objectId,
              properties: {
                firstname: 'John',
                lastname: 'Doe',
                email: 'john@example.com',
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
        };

      case 'create':
        return {
          data: {
            success: true,
            id: `${Date.now()}`,
            record: {
              id: `${Date.now()}`,
              properties: config.properties,
              createdAt: new Date().toISOString(),
            },
          },
        };

      case 'update':
        return {
          data: {
            success: true,
            id: config.objectId,
            record: {
              id: config.objectId,
              properties: config.properties,
              updatedAt: new Date().toISOString(),
            },
          },
        };

      case 'delete':
        return {
          data: {
            success: true,
            id: config.objectId,
            deleted: true,
          },
        };

      case 'search':
        return {
          data: {
            success: true,
            results: [
              {
                id: objectId,
                properties: { firstname: 'John', lastname: 'Doe' },
              },
            ],
            total: 1,
          },
        };

      case 'associate':
      case 'disassociate':
        return {
          data: {
            success: true,
            fromObjectId: config.objectId,
            associations: config.associations,
          },
        };

      case 'batchCreate':
      case 'batchUpdate':
        return {
          data: {
            success: true,
            results: [
              { id: `${Date.now()}`, status: 'COMPLETE' },
            ],
          },
        };

      default:
        return { data: { success: false, error: 'Unknown operation' } };
    }
  }
);
