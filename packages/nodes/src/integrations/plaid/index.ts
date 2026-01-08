import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const PlaidNodeSchema = z.object({
  resource: z.enum(['accounts', 'transactions', 'balance', 'identity', 'auth', 'liabilities', 'investments', 'linkToken']).default('accounts'),
  operation: z.enum(['get', 'sync', 'refresh', 'create', 'exchange']).default('get'),
  accessToken: z.string().optional(),
  publicToken: z.string().optional(),
  accountIds: z.array(z.string()).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  count: z.number().min(1).max(500).default(100),
  offset: z.number().min(0).default(0),
  cursor: z.string().optional(),
  clientUserId: z.string().optional(),
  clientName: z.string().optional(),
  products: z.array(z.enum(['transactions', 'auth', 'identity', 'assets', 'investments', 'liabilities', 'payment_initiation'])).optional(),
  countryCodes: z.array(z.string()).default(['US']),
  language: z.string().default('en'),
  webhook: z.string().optional(),
  redirectUri: z.string().optional(),
  environment: z.enum(['sandbox', 'development', 'production']).default('sandbox'),
  credentialId: z.string().optional(),
});

export type PlaidNodeConfig = z.infer<typeof PlaidNodeSchema>;

export const plaidNode: NodeDefinition = createNode(
  {
    type: 'integration.plaid',
    category: 'integration',
    name: 'Plaid',
    description: 'Banking data - Accounts, transactions, identity',
    icon: 'Building',
    inputs: [
      input.select(
        'resource',
        'Resource',
        [
          { label: 'Accounts', value: 'accounts' },
          { label: 'Transactions', value: 'transactions' },
          { label: 'Balance', value: 'balance' },
          { label: 'Identity', value: 'identity' },
          { label: 'Auth (ACH)', value: 'auth' },
          { label: 'Liabilities', value: 'liabilities' },
          { label: 'Investments', value: 'investments' },
          { label: 'Link Token', value: 'linkToken' },
        ],
        { default: 'accounts' }
      ),
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Get', value: 'get' },
          { label: 'Sync', value: 'sync' },
          { label: 'Refresh', value: 'refresh' },
          { label: 'Create', value: 'create' },
          { label: 'Exchange Token', value: 'exchange' },
        ],
        { default: 'get' }
      ),
      input.string('accessToken', 'Access Token', {
        description: 'Plaid access token',
      }),
      input.string('publicToken', 'Public Token', {
        description: 'Public token to exchange',
      }),
      input.json('accountIds', 'Account IDs', {
        description: 'Specific account IDs',
        default: [],
      }),
      input.string('startDate', 'Start Date', {
        description: 'Start date (YYYY-MM-DD)',
        placeholder: '2024-01-01',
      }),
      input.string('endDate', 'End Date', {
        description: 'End date (YYYY-MM-DD)',
        placeholder: '2024-01-31',
      }),
      input.number('count', 'Count', {
        description: 'Number of transactions',
        default: 100,
        min: 1,
        max: 500,
      }),
      input.number('offset', 'Offset', {
        description: 'Pagination offset',
        default: 0,
      }),
      input.string('cursor', 'Cursor', {
        description: 'Pagination cursor for sync',
      }),
      input.string('clientUserId', 'Client User ID', {
        description: 'Unique user identifier',
      }),
      input.string('clientName', 'Client Name', {
        description: 'Your application name',
      }),
      input.json('products', 'Products', {
        description: 'Plaid products to enable',
        default: ['transactions'],
      }),
      input.json('countryCodes', 'Country Codes', {
        description: 'Supported countries',
        default: ['US'],
      }),
      input.string('language', 'Language', {
        description: 'Link language',
        default: 'en',
      }),
      input.string('webhook', 'Webhook URL', {
        description: 'Webhook URL for updates',
      }),
      input.select(
        'environment',
        'Environment',
        [
          { label: 'Sandbox', value: 'sandbox' },
          { label: 'Development', value: 'development' },
          { label: 'Production', value: 'production' },
        ],
        { default: 'sandbox' }
      ),
      input.credential('credentialId', 'Plaid Credentials', {
        description: 'Plaid API credentials',
        credentialTypes: ['API_KEY'],
        required: true,
      }),
    ],
    outputs: [output.main({ description: 'API operation result' })],
    defaults: {
      resource: 'accounts',
      operation: 'get',
      count: 100,
      offset: 0,
      countryCodes: ['US'],
      language: 'en',
      environment: 'sandbox',
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = PlaidNodeSchema.parse(nodeInput.config);

    logger.info(`Plaid ${config.operation} on ${config.resource}`);

    switch (config.resource) {
      case 'accounts':
        return {
          data: {
            success: true,
            accounts: [
              {
                account_id: 'acc_123',
                name: 'Checking Account',
                official_name: 'PREMIUM CHECKING',
                type: 'depository',
                subtype: 'checking',
                mask: '0000',
                balances: { available: 1500.00, current: 1520.00, currency: 'USD' },
              },
              {
                account_id: 'acc_456',
                name: 'Savings Account',
                type: 'depository',
                subtype: 'savings',
                mask: '1234',
                balances: { available: 5000.00, current: 5000.00, currency: 'USD' },
              },
            ],
          },
        };

      case 'transactions':
        return {
          data: {
            success: true,
            transactions: [
              {
                transaction_id: 'txn_1',
                account_id: 'acc_123',
                amount: 25.50,
                date: '2024-01-15',
                name: 'Amazon',
                category: ['Shopping', 'Online Marketplace'],
                pending: false,
              },
              {
                transaction_id: 'txn_2',
                account_id: 'acc_123',
                amount: -2500.00,
                date: '2024-01-14',
                name: 'Direct Deposit',
                category: ['Transfer', 'Payroll'],
                pending: false,
              },
            ],
          },
        };

      case 'balance':
        return {
          data: {
            success: true,
            balance: {
              accounts: [
                { account_id: 'acc_123', balances: { available: 1500.00, current: 1520.00 } },
              ],
            },
          },
        };

      case 'identity':
        return {
          data: {
            success: true,
            identity: {
              accounts: [{
                owners: [{
                  names: ['John Doe'],
                  emails: [{ data: 'john@example.com', type: 'primary' }],
                  phone_numbers: [{ data: '+15551234567', type: 'mobile' }],
                  addresses: [{ data: { city: 'New York', region: 'NY', country: 'US' } }],
                }],
              }],
            },
          },
        };

      case 'linkToken':
        return {
          data: {
            success: true,
            linkToken: `link-sandbox-${Date.now()}-abc123`,
            expiration: new Date(Date.now() + 4 * 3600000).toISOString(),
          },
        };

      default:
        return { data: { success: true } };
    }
  }
);
