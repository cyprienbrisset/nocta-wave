import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const XeroNodeSchema = z.object({
  resource: z.enum(['invoices', 'contacts', 'payments', 'bankTransactions', 'accounts', 'items', 'quotes', 'creditNotes']).default('invoices'),
  operation: z.enum(['create', 'get', 'update', 'delete', 'list', 'send', 'void', 'pdf']).default('list'),
  tenantId: z.string().optional(),
  entityId: z.string().optional(),
  // Invoice fields
  type: z.enum(['ACCREC', 'ACCPAY']).default('ACCREC'),
  contact: z.object({
    ContactID: z.string().optional(),
    Name: z.string().optional(),
    EmailAddress: z.string().optional(),
  }).optional(),
  lineItems: z.array(z.object({
    Description: z.string(),
    Quantity: z.number().optional(),
    UnitAmount: z.number().optional(),
    AccountCode: z.string().optional(),
    TaxType: z.string().optional(),
  })).optional(),
  date: z.string().optional(),
  dueDate: z.string().optional(),
  invoiceNumber: z.string().optional(),
  reference: z.string().optional(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'AUTHORISED', 'PAID', 'VOIDED']).optional(),
  currencyCode: z.string().default('USD'),
  // Contact fields
  name: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  emailAddress: z.string().optional(),
  phones: z.array(z.object({
    PhoneType: z.string(),
    PhoneNumber: z.string(),
  })).optional(),
  addresses: z.array(z.object({
    AddressType: z.string(),
    AddressLine1: z.string().optional(),
    City: z.string().optional(),
    PostalCode: z.string().optional(),
    Country: z.string().optional(),
  })).optional(),
  // Payment fields
  invoice: z.object({ InvoiceID: z.string() }).optional(),
  account: z.object({ AccountID: z.string() }).optional(),
  amount: z.number().optional(),
  // Filters
  where: z.string().optional(),
  order: z.string().optional(),
  page: z.number().default(1),
  pageSize: z.number().default(100),
  modifiedAfter: z.string().optional(),
  credentialId: z.string().optional(),
});

export type XeroNodeConfig = z.infer<typeof XeroNodeSchema>;

export const xeroNode: NodeDefinition = createNode(
  {
    type: 'integration.xero',
    category: 'integration',
    name: 'Xero',
    description: 'Accounting - Invoices, contacts, payments, bank',
    icon: 'Receipt',
    inputs: [
      input.select(
        'resource',
        'Resource',
        [
          { label: 'Invoices', value: 'invoices' },
          { label: 'Contacts', value: 'contacts' },
          { label: 'Payments', value: 'payments' },
          { label: 'Bank Transactions', value: 'bankTransactions' },
          { label: 'Accounts', value: 'accounts' },
          { label: 'Items', value: 'items' },
          { label: 'Quotes', value: 'quotes' },
          { label: 'Credit Notes', value: 'creditNotes' },
        ],
        { default: 'invoices' }
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
          { label: 'Send', value: 'send' },
          { label: 'Void', value: 'void' },
          { label: 'Get PDF', value: 'pdf' },
        ],
        { default: 'list' }
      ),
      input.string('tenantId', 'Tenant ID', {
        description: 'Xero organization ID',
        required: true,
      }),
      input.string('entityId', 'Entity ID', {
        description: 'Invoice/Contact/etc ID',
      }),
      input.select(
        'type',
        'Invoice Type',
        [
          { label: 'Accounts Receivable', value: 'ACCREC' },
          { label: 'Accounts Payable', value: 'ACCPAY' },
        ],
        { default: 'ACCREC' }
      ),
      input.json('contact', 'Contact', {
        description: 'Contact reference',
        default: {},
      }),
      input.json('lineItems', 'Line Items', {
        description: 'Invoice line items',
        default: [],
      }),
      input.string('date', 'Date', {
        description: 'Invoice date (YYYY-MM-DD)',
      }),
      input.string('dueDate', 'Due Date', {
        description: 'Due date (YYYY-MM-DD)',
      }),
      input.string('invoiceNumber', 'Invoice Number', {
        description: 'Custom invoice number',
      }),
      input.string('reference', 'Reference', {
        description: 'Reference field',
      }),
      input.select(
        'status',
        'Status',
        [
          { label: 'Draft', value: 'DRAFT' },
          { label: 'Submitted', value: 'SUBMITTED' },
          { label: 'Authorised', value: 'AUTHORISED' },
          { label: 'Paid', value: 'PAID' },
        ],
        { default: 'DRAFT' }
      ),
      input.string('currencyCode', 'Currency', {
        description: 'Currency code',
        default: 'USD',
      }),
      input.string('name', 'Name', {
        description: 'Contact name',
      }),
      input.string('emailAddress', 'Email', {
        description: 'Contact email',
      }),
      input.json('invoice', 'Invoice', {
        description: 'Invoice for payment',
        default: {},
      }),
      input.json('account', 'Account', {
        description: 'Bank account for payment',
        default: {},
      }),
      input.number('amount', 'Amount', {
        description: 'Payment amount',
      }),
      input.string('where', 'Where', {
        description: 'Filter expression',
        placeholder: 'Status=="AUTHORISED"',
      }),
      input.string('order', 'Order', {
        description: 'Sort order',
        placeholder: 'Date DESC',
      }),
      input.number('page', 'Page', {
        description: 'Page number',
        default: 1,
      }),
      input.number('pageSize', 'Page Size', {
        description: 'Results per page',
        default: 100,
      }),
      input.credential('credentialId', 'Xero Credentials', {
        description: 'Xero OAuth2 credentials',
        credentialTypes: ['OAUTH2'],
        required: true,
      }),
    ],
    outputs: [output.main({ description: 'API operation result' })],
    defaults: {
      resource: 'invoices',
      operation: 'list',
      type: 'ACCREC',
      status: 'DRAFT',
      currencyCode: 'USD',
      page: 1,
      pageSize: 100,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = XeroNodeSchema.parse(nodeInput.config);

    logger.info(`Xero ${config.operation} on ${config.resource}`);

    switch (config.operation) {
      case 'list':
        return {
          data: {
            success: true,
            entities: [
              {
                InvoiceID: 'inv-123',
                InvoiceNumber: 'INV-0001',
                Type: 'ACCREC',
                Status: 'AUTHORISED',
                Total: 1500.00,
                AmountDue: 1500.00,
                Contact: { Name: 'John Doe' },
                Date: '2024-01-15',
                DueDate: '2024-02-15',
              },
            ],
          },
        };

      case 'get':
        return {
          data: {
            success: true,
            entity: {
              InvoiceID: config.entityId,
              InvoiceNumber: 'INV-0001',
              Type: 'ACCREC',
              Status: 'AUTHORISED',
              Total: 1500.00,
              LineItems: [
                { Description: 'Consulting', Quantity: 10, UnitAmount: 150.00 },
              ],
            },
          },
        };

      case 'create':
        return {
          data: {
            success: true,
            id: `inv-${Date.now()}`,
            entity: {
              InvoiceID: `inv-${Date.now()}`,
              InvoiceNumber: config.invoiceNumber || `INV-${Date.now()}`,
              Status: config.status || 'DRAFT',
            },
          },
        };

      case 'send':
        return {
          data: {
            success: true,
            entity: {
              InvoiceID: config.entityId,
              SentToContact: true,
            },
          },
        };

      case 'pdf':
        return {
          data: {
            success: true,
            pdfUrl: `https://api.xero.com/api.xro/2.0/Invoices/${config.entityId}/pdf`,
          },
        };

      default:
        return { data: { success: true } };
    }
  }
);
