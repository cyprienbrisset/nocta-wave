import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const QuickBooksNodeSchema = z.object({
  resource: z.enum(['invoices', 'customers', 'payments', 'items', 'bills', 'vendors', 'accounts', 'estimates', 'expenses']).default('invoices'),
  operation: z.enum(['create', 'read', 'update', 'delete', 'query', 'send', 'void', 'pdf']).default('query'),
  realmId: z.string().optional(),
  entityId: z.string().optional(),
  queryString: z.string().optional(),
  startPosition: z.number().default(1),
  maxResults: z.number().default(100),
  // Invoice fields
  customerRef: z.object({
    value: z.string(),
    name: z.string().optional(),
  }).optional(),
  line: z.array(z.object({
    Amount: z.number(),
    DetailType: z.string(),
    Description: z.string().optional(),
    SalesItemLineDetail: z.object({
      ItemRef: z.object({ value: z.string() }).optional(),
      Qty: z.number().optional(),
      UnitPrice: z.number().optional(),
    }).optional(),
  })).optional(),
  dueDate: z.string().optional(),
  txnDate: z.string().optional(),
  docNumber: z.string().optional(),
  privateNote: z.string().optional(),
  // Customer fields
  displayName: z.string().optional(),
  primaryEmailAddr: z.object({ Address: z.string() }).optional(),
  primaryPhone: z.object({ FreeFormNumber: z.string() }).optional(),
  billAddr: z.object({
    Line1: z.string().optional(),
    City: z.string().optional(),
    CountrySubDivisionCode: z.string().optional(),
    PostalCode: z.string().optional(),
    Country: z.string().optional(),
  }).optional(),
  // Payment fields
  totalAmt: z.number().optional(),
  paymentMethodRef: z.object({ value: z.string() }).optional(),
  depositToAccountRef: z.object({ value: z.string() }).optional(),
  environment: z.enum(['sandbox', 'production']).default('sandbox'),
  credentialId: z.string().optional(),
});

export type QuickBooksNodeConfig = z.infer<typeof QuickBooksNodeSchema>;

export const quickbooksNode: NodeDefinition = createNode(
  {
    type: 'integration.quickbooks',
    category: 'integration',
    name: 'QuickBooks',
    description: 'Accounting - Invoices, customers, payments, expenses',
    icon: 'Calculator',
    inputs: [
      input.select(
        'resource',
        'Resource',
        [
          { label: 'Invoices', value: 'invoices' },
          { label: 'Customers', value: 'customers' },
          { label: 'Payments', value: 'payments' },
          { label: 'Items', value: 'items' },
          { label: 'Bills', value: 'bills' },
          { label: 'Vendors', value: 'vendors' },
          { label: 'Accounts', value: 'accounts' },
          { label: 'Estimates', value: 'estimates' },
          { label: 'Expenses', value: 'expenses' },
        ],
        { default: 'invoices' }
      ),
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Query', value: 'query' },
          { label: 'Read', value: 'read' },
          { label: 'Create', value: 'create' },
          { label: 'Update', value: 'update' },
          { label: 'Delete', value: 'delete' },
          { label: 'Send', value: 'send' },
          { label: 'Void', value: 'void' },
          { label: 'Get PDF', value: 'pdf' },
        ],
        { default: 'query' }
      ),
      input.string('realmId', 'Company ID', {
        description: 'QuickBooks company/realm ID',
        required: true,
      }),
      input.string('entityId', 'Entity ID', {
        description: 'ID of the entity',
      }),
      input.string('queryString', 'Query', {
        description: 'SQL-like query string',
        placeholder: "SELECT * FROM Invoice WHERE TotalAmt > '100'",
      }),
      input.number('startPosition', 'Start Position', {
        description: 'Pagination start',
        default: 1,
      }),
      input.number('maxResults', 'Max Results', {
        description: 'Maximum results',
        default: 100,
      }),
      input.json('customerRef', 'Customer Reference', {
        description: 'Customer for invoice',
        default: {},
      }),
      input.json('line', 'Line Items', {
        description: 'Invoice line items',
        default: [],
      }),
      input.string('dueDate', 'Due Date', {
        description: 'Due date (YYYY-MM-DD)',
      }),
      input.string('txnDate', 'Transaction Date', {
        description: 'Transaction date',
      }),
      input.string('docNumber', 'Document Number', {
        description: 'Invoice/document number',
      }),
      input.string('displayName', 'Display Name', {
        description: 'Customer display name',
      }),
      input.json('primaryEmailAddr', 'Email', {
        description: 'Primary email',
        default: {},
      }),
      input.json('billAddr', 'Billing Address', {
        description: 'Billing address',
        default: {},
      }),
      input.number('totalAmt', 'Total Amount', {
        description: 'Payment amount',
      }),
      input.select(
        'environment',
        'Environment',
        [
          { label: 'Sandbox', value: 'sandbox' },
          { label: 'Production', value: 'production' },
        ],
        { default: 'sandbox' }
      ),
      input.credential('credentialId', 'QuickBooks Credentials', {
        description: 'QuickBooks OAuth2 credentials',
        credentialTypes: ['OAUTH2'],
        required: true,
      }),
    ],
    outputs: [
      output.boolean('success', 'Operation success'),
      output.object('entity', 'Single entity'),
      output.array('entities', 'Query results'),
      output.string('id', 'Entity ID'),
      output.string('pdfUrl', 'PDF download URL'),
      output.number('totalCount', 'Total count'),
    ],
    defaults: {
      resource: 'invoices',
      operation: 'query',
      startPosition: 1,
      maxResults: 100,
      environment: 'sandbox',
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = QuickBooksNodeSchema.parse(nodeInput.config);

    logger.info(`QuickBooks ${config.operation} on ${config.resource}`);

    switch (config.operation) {
      case 'query':
        return {
          data: {
            success: true,
            entities: [
              {
                Id: '123',
                DocNumber: 'INV-001',
                TotalAmt: 500.00,
                Balance: 0,
                CustomerRef: { value: '1', name: 'John Doe' },
                TxnDate: '2024-01-15',
                DueDate: '2024-02-15',
              },
            ],
            totalCount: 1,
          },
        };

      case 'read':
        return {
          data: {
            success: true,
            entity: {
              Id: config.entityId,
              DocNumber: 'INV-001',
              TotalAmt: 500.00,
              Balance: 0,
              Line: [
                { Amount: 500.00, Description: 'Consulting Services' },
              ],
            },
          },
        };

      case 'create':
        return {
          data: {
            success: true,
            id: String(Date.now()),
            entity: {
              Id: String(Date.now()),
              DocNumber: config.docNumber || `INV-${Date.now()}`,
              TotalAmt: config.line?.reduce((sum, l) => sum + l.Amount, 0) || 0,
            },
          },
        };

      case 'send':
        return {
          data: {
            success: true,
            entity: {
              Id: config.entityId,
              EmailStatus: 'EmailSent',
            },
          },
        };

      case 'pdf':
        return {
          data: {
            success: true,
            pdfUrl: `https://quickbooks.api.intuit.com/v3/company/${config.realmId}/invoice/${config.entityId}/pdf`,
          },
        };

      default:
        return { data: { success: true } };
    }
  }
);
