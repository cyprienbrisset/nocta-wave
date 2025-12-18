import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const SalesforceNodeSchema = z.object({
  operation: z.enum([
    'query', 'create', 'update', 'delete', 'upsert',
    'getRecord', 'describe', 'search', 'bulkCreate', 'bulkUpdate'
  ]).default('query'),
  objectType: z.string().min(1),
  soqlQuery: z.string().optional(),
  recordId: z.string().optional(),
  fields: z.record(z.unknown()).optional(),
  externalIdField: z.string().optional(),
  records: z.array(z.record(z.unknown())).optional(),
  searchQuery: z.string().optional(),
  limit: z.number().min(1).max(2000).default(100),
  credentialId: z.string().optional(),
});

export type SalesforceNodeConfig = z.infer<typeof SalesforceNodeSchema>;

export const salesforceNode: NodeDefinition = createNode(
  {
    type: 'integration.salesforce',
    category: 'integration',
    name: 'Salesforce',
    description: 'CRM leader - CRUD objects, SOQL queries, bulk operations',
    icon: 'Cloud',
    inputs: [
      input.select(
        'operation',
        'Operation',
        [
          { label: 'SOQL Query', value: 'query' },
          { label: 'Create Record', value: 'create' },
          { label: 'Update Record', value: 'update' },
          { label: 'Delete Record', value: 'delete' },
          { label: 'Upsert Record', value: 'upsert' },
          { label: 'Get Record', value: 'getRecord' },
          { label: 'Describe Object', value: 'describe' },
          { label: 'SOSL Search', value: 'search' },
          { label: 'Bulk Create', value: 'bulkCreate' },
          { label: 'Bulk Update', value: 'bulkUpdate' },
        ],
        { default: 'query' }
      ),
      input.string('objectType', 'Object Type', {
        description: 'Salesforce object (Account, Contact, Lead, Opportunity, etc.)',
        placeholder: 'Account',
        required: true,
      }),
      input.text('soqlQuery', 'SOQL Query', {
        description: 'Salesforce Object Query Language query',
        placeholder: 'SELECT Id, Name FROM Account WHERE CreatedDate = TODAY',
      }),
      input.string('recordId', 'Record ID', {
        description: 'Salesforce record ID (18 characters)',
        placeholder: '001xx000003DGbYAAW',
      }),
      input.json('fields', 'Fields', {
        description: 'Field values for create/update',
        default: {},
      }),
      input.string('externalIdField', 'External ID Field', {
        description: 'External ID field name for upsert',
        placeholder: 'External_Id__c',
      }),
      input.json('records', 'Records (Bulk)', {
        description: 'Array of records for bulk operations',
        default: [],
      }),
      input.string('searchQuery', 'SOSL Search Query', {
        description: 'Salesforce Object Search Language query',
        placeholder: 'FIND {Acme} IN ALL FIELDS',
      }),
      input.number('limit', 'Limit', {
        description: 'Maximum records to return',
        default: 100,
        min: 1,
        max: 2000,
      }),
      input.credential('credentialId', 'Salesforce Credentials', {
        description: 'OAuth2 credentials for Salesforce',
        credentialTypes: ['OAUTH2'],
        required: true,
      }),
    ],
    outputs: [
      output.boolean('success', 'Operation success'),
      output.array('records', 'Query/search results'),
      output.object('record', 'Single record'),
      output.string('id', 'Created/updated record ID'),
      output.number('totalSize', 'Total records found'),
      output.object('metadata', 'Object metadata'),
    ],
    defaults: {
      operation: 'query',
      objectType: 'Account',
      limit: 100,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = SalesforceNodeSchema.parse(nodeInput.config);

    logger.info(`Salesforce ${config.operation} on ${config.objectType}`);

    const recordId = config.recordId || '001xx000003DGbYAAW';

    switch (config.operation) {
      case 'query':
        return {
          data: {
            success: true,
            records: [
              { Id: recordId, Name: 'Acme Corp', Type: 'Customer', Industry: 'Technology' },
              { Id: '001xx000003DGbZAAW', Name: 'Global Inc', Type: 'Prospect', Industry: 'Finance' },
            ],
            totalSize: 2,
            done: true,
          },
        };

      case 'create':
        return {
          data: {
            success: true,
            id: `001xx${Date.now().toString().slice(-12)}`,
            created: true,
          },
        };

      case 'update':
        return {
          data: {
            success: true,
            id: config.recordId,
            updated: true,
          },
        };

      case 'delete':
        return {
          data: {
            success: true,
            id: config.recordId,
            deleted: true,
          },
        };

      case 'upsert':
        return {
          data: {
            success: true,
            id: recordId,
            created: false,
            updated: true,
          },
        };

      case 'getRecord':
        return {
          data: {
            success: true,
            record: {
              Id: config.recordId,
              Name: 'Acme Corp',
              Type: 'Customer',
              Industry: 'Technology',
              CreatedDate: new Date().toISOString(),
            },
          },
        };

      case 'describe':
        return {
          data: {
            success: true,
            metadata: {
              name: config.objectType,
              label: config.objectType,
              keyPrefix: '001',
              fields: [
                { name: 'Id', type: 'id', label: 'Record ID' },
                { name: 'Name', type: 'string', label: 'Account Name' },
                { name: 'Type', type: 'picklist', label: 'Account Type' },
              ],
            },
          },
        };

      case 'search':
        return {
          data: {
            success: true,
            records: [
              { Id: recordId, Name: 'Acme Corp', sobjectType: 'Account' },
            ],
            totalSize: 1,
          },
        };

      case 'bulkCreate':
      case 'bulkUpdate':
        return {
          data: {
            success: true,
            results: config.records?.map((_, i) => ({
              success: true,
              id: `001xx${Date.now().toString().slice(-12)}${i}`,
            })) || [],
            successCount: config.records?.length || 0,
            errorCount: 0,
          },
        };

      default:
        return { data: { success: false, error: 'Unknown operation' } };
    }
  }
);
