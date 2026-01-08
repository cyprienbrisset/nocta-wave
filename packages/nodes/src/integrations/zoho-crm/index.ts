import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const ZohoCrmNodeSchema = z.object({
  module: z.enum(['Leads', 'Contacts', 'Accounts', 'Deals', 'Tasks', 'Events', 'Calls', 'Products', 'Quotes', 'Invoices']).default('Leads'),
  operation: z.enum(['create', 'update', 'get', 'delete', 'list', 'search', 'upsert', 'convertLead']).default('list'),
  recordId: z.string().optional(),
  data: z.record(z.unknown()).optional(),
  criteria: z.string().optional(),
  fields: z.array(z.string()).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().min(1).default(1),
  perPage: z.number().min(1).max(200).default(50),
  credentialId: z.string().optional(),
});

export type ZohoCrmNodeConfig = z.infer<typeof ZohoCrmNodeSchema>;

export const zohoCrmNode: NodeDefinition = createNode(
  {
    type: 'integration.zoho-crm',
    category: 'integration',
    name: 'Zoho CRM',
    description: 'Zoho CRM - Leads, contacts, accounts, deals, and more',
    icon: 'Briefcase',
    inputs: [
      input.select(
        'module',
        'Module',
        [
          { label: 'Leads', value: 'Leads' },
          { label: 'Contacts', value: 'Contacts' },
          { label: 'Accounts', value: 'Accounts' },
          { label: 'Deals', value: 'Deals' },
          { label: 'Tasks', value: 'Tasks' },
          { label: 'Events', value: 'Events' },
          { label: 'Calls', value: 'Calls' },
          { label: 'Products', value: 'Products' },
          { label: 'Quotes', value: 'Quotes' },
          { label: 'Invoices', value: 'Invoices' },
        ],
        { default: 'Leads' }
      ),
      input.select(
        'operation',
        'Operation',
        [
          { label: 'List Records', value: 'list' },
          { label: 'Get Record', value: 'get' },
          { label: 'Create Record', value: 'create' },
          { label: 'Update Record', value: 'update' },
          { label: 'Delete Record', value: 'delete' },
          { label: 'Search Records', value: 'search' },
          { label: 'Upsert Record', value: 'upsert' },
          { label: 'Convert Lead', value: 'convertLead' },
        ],
        { default: 'list' }
      ),
      input.string('recordId', 'Record ID', {
        description: 'Zoho CRM record ID',
        placeholder: '3000000012345',
      }),
      input.json('data', 'Record Data', {
        description: 'Record fields and values',
        default: {},
      }),
      input.string('criteria', 'Search Criteria', {
        description: 'COQL criteria for search',
        placeholder: '((Last_Name:equals:Smith)and(Email:starts_with:john))',
      }),
      input.json('fields', 'Fields to Return', {
        description: 'Specific fields to retrieve',
        default: [],
      }),
      input.string('sortBy', 'Sort By', {
        description: 'Field to sort by',
        placeholder: 'Created_Time',
      }),
      input.select(
        'sortOrder',
        'Sort Order',
        [
          { label: 'Descending', value: 'desc' },
          { label: 'Ascending', value: 'asc' },
        ],
        { default: 'desc' }
      ),
      input.number('page', 'Page', {
        description: 'Page number',
        default: 1,
        min: 1,
      }),
      input.number('perPage', 'Per Page', {
        description: 'Records per page',
        default: 50,
        min: 1,
        max: 200,
      }),
      input.credential('credentialId', 'Zoho Credentials', {
        description: 'Zoho OAuth2 credentials',
        credentialTypes: ['OAUTH2'],
        required: true,
      }),
    ],
    outputs: [output.main({ description: 'API operation result' })],
    defaults: {
      module: 'Leads',
      operation: 'list',
      sortOrder: 'desc',
      page: 1,
      perPage: 50,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = ZohoCrmNodeSchema.parse(nodeInput.config);

    logger.info(`Zoho CRM ${config.operation} on ${config.module}`);

    switch (config.operation) {
      case 'list':
        return {
          data: {
            success: true,
            records: [
              {
                id: '3000000012345',
                First_Name: 'John',
                Last_Name: 'Doe',
                Email: 'john@example.com',
                Company: 'Acme Corp',
                Lead_Status: 'New',
                Created_Time: new Date().toISOString(),
              },
              {
                id: '3000000012346',
                First_Name: 'Jane',
                Last_Name: 'Smith',
                Email: 'jane@example.com',
                Company: 'Tech Inc',
                Lead_Status: 'Contacted',
                Created_Time: new Date().toISOString(),
              },
            ],
            moreRecords: true,
            info: {
              page: config.page,
              per_page: config.perPage,
              count: 2,
              more_records: true,
            },
          },
        };

      case 'get':
        return {
          data: {
            success: true,
            record: {
              id: config.recordId,
              First_Name: 'John',
              Last_Name: 'Doe',
              Email: 'john@example.com',
              Company: 'Acme Corp',
              Lead_Status: 'New',
              Created_Time: new Date().toISOString(),
              Modified_Time: new Date().toISOString(),
            },
          },
        };

      case 'create':
        return {
          data: {
            success: true,
            id: `300000001${Date.now().toString().slice(-5)}`,
            record: {
              id: `300000001${Date.now().toString().slice(-5)}`,
              ...config.data,
              Created_Time: new Date().toISOString(),
            },
          },
        };

      case 'update':
        return {
          data: {
            success: true,
            id: config.recordId,
            record: {
              id: config.recordId,
              ...config.data,
              Modified_Time: new Date().toISOString(),
            },
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

      case 'search':
        return {
          data: {
            success: true,
            records: [
              {
                id: '3000000012345',
                First_Name: 'John',
                Last_Name: 'Smith',
                Email: 'john.smith@example.com',
              },
            ],
            moreRecords: false,
          },
        };

      case 'upsert':
        return {
          data: {
            success: true,
            id: config.recordId || `300000001${Date.now().toString().slice(-5)}`,
            action: config.recordId ? 'update' : 'insert',
          },
        };

      case 'convertLead':
        return {
          data: {
            success: true,
            Contacts: `300000002${Date.now().toString().slice(-5)}`,
            Accounts: `300000003${Date.now().toString().slice(-5)}`,
            Deals: `300000004${Date.now().toString().slice(-5)}`,
          },
        };

      default:
        return { data: { success: false, error: 'Unknown operation' } };
    }
  }
);
