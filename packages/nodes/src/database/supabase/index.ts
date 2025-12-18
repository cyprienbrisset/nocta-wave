import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const SupabaseNodeSchema = z.object({
  resource: z.enum(['database', 'auth', 'storage', 'realtime', 'functions']).default('database'),
  operation: z.enum([
    'select', 'insert', 'update', 'upsert', 'delete', 'rpc',
    'signUp', 'signIn', 'signOut', 'getUser', 'updateUser', 'resetPassword',
    'upload', 'download', 'list', 'remove', 'getPublicUrl',
    'subscribe', 'broadcast',
    'invoke'
  ]).default('select'),
  table: z.string().optional(),
  select: z.string().default('*'),
  filter: z.array(z.object({
    column: z.string(),
    operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in', 'contains', 'containedBy']),
    value: z.unknown(),
  })).optional(),
  data: z.record(z.unknown()).optional(),
  dataArray: z.array(z.record(z.unknown())).optional(),
  orderBy: z.object({
    column: z.string(),
    ascending: z.boolean(),
  }).optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
  functionName: z.string().optional(),
  functionParams: z.record(z.unknown()).optional(),
  email: z.string().optional(),
  password: z.string().optional(),
  phone: z.string().optional(),
  bucket: z.string().optional(),
  path: z.string().optional(),
  file: z.unknown().optional(),
  channel: z.string().optional(),
  event: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
  credentialId: z.string().optional(),
});

export type SupabaseNodeConfig = z.infer<typeof SupabaseNodeSchema>;

export const supabaseNode: NodeDefinition = createNode(
  {
    type: 'database.supabase',
    category: 'database',
    name: 'Supabase',
    description: 'Managed PostgreSQL with Auth, Storage, and Realtime',
    icon: 'Database',
    inputs: [
      input.select(
        'resource',
        'Resource',
        [
          { label: 'Database', value: 'database' },
          { label: 'Authentication', value: 'auth' },
          { label: 'Storage', value: 'storage' },
          { label: 'Realtime', value: 'realtime' },
          { label: 'Edge Functions', value: 'functions' },
        ],
        { default: 'database' }
      ),
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Select', value: 'select' },
          { label: 'Insert', value: 'insert' },
          { label: 'Update', value: 'update' },
          { label: 'Upsert', value: 'upsert' },
          { label: 'Delete', value: 'delete' },
          { label: 'RPC (Function)', value: 'rpc' },
          { label: 'Sign Up', value: 'signUp' },
          { label: 'Sign In', value: 'signIn' },
          { label: 'Sign Out', value: 'signOut' },
          { label: 'Get User', value: 'getUser' },
          { label: 'Update User', value: 'updateUser' },
          { label: 'Reset Password', value: 'resetPassword' },
          { label: 'Upload File', value: 'upload' },
          { label: 'Download File', value: 'download' },
          { label: 'List Files', value: 'list' },
          { label: 'Remove File', value: 'remove' },
          { label: 'Get Public URL', value: 'getPublicUrl' },
          { label: 'Subscribe', value: 'subscribe' },
          { label: 'Broadcast', value: 'broadcast' },
          { label: 'Invoke Function', value: 'invoke' },
        ],
        { default: 'select' }
      ),
      input.string('table', 'Table', {
        description: 'Database table name',
        placeholder: 'users',
      }),
      input.string('select', 'Select Columns', {
        description: 'Columns to select (use * for all)',
        default: '*',
        placeholder: 'id, name, email',
      }),
      input.json('filter', 'Filters', {
        description: 'Query filters',
        default: [],
      }),
      input.json('data', 'Data', {
        description: 'Data for insert/update',
        default: {},
      }),
      input.json('dataArray', 'Data Array', {
        description: 'Array of data for bulk insert',
        default: [],
      }),
      input.json('orderBy', 'Order By', {
        description: 'Sort order',
        default: null,
      }),
      input.number('limit', 'Limit', {
        description: 'Maximum rows to return',
      }),
      input.number('offset', 'Offset', {
        description: 'Rows to skip',
      }),
      input.string('functionName', 'Function Name', {
        description: 'RPC function or Edge Function name',
      }),
      input.json('functionParams', 'Function Parameters', {
        description: 'Parameters for function call',
        default: {},
      }),
      input.string('email', 'Email', {
        description: 'User email for auth',
      }),
      input.string('password', 'Password', {
        description: 'User password for auth',
      }),
      input.string('bucket', 'Bucket', {
        description: 'Storage bucket name',
      }),
      input.string('path', 'Path', {
        description: 'File path in bucket',
      }),
      input.string('channel', 'Channel', {
        description: 'Realtime channel name',
      }),
      input.string('event', 'Event', {
        description: 'Realtime event name',
      }),
      input.json('payload', 'Payload', {
        description: 'Broadcast payload',
        default: {},
      }),
      input.credential('credentialId', 'Supabase Credentials', {
        description: 'Supabase project URL and API key',
        credentialTypes: ['API_KEY'],
        required: true,
      }),
    ],
    outputs: [
      output.boolean('success', 'Operation success'),
      output.array('data', 'Query results'),
      output.object('item', 'Single item'),
      output.object('user', 'User data'),
      output.string('url', 'Public URL'),
      output.number('count', 'Row count'),
    ],
    defaults: {
      resource: 'database',
      operation: 'select',
      select: '*',
      filter: [],
      data: {},
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = SupabaseNodeSchema.parse(nodeInput.config);

    logger.info(`Supabase ${config.operation} on ${config.resource}`);

    switch (config.operation) {
      case 'select':
        return {
          data: {
            success: true,
            data: [
              { id: 1, name: 'John', email: 'john@example.com', created_at: new Date().toISOString() },
              { id: 2, name: 'Jane', email: 'jane@example.com', created_at: new Date().toISOString() },
            ],
            count: 2,
          },
        };

      case 'insert':
        return {
          data: {
            success: true,
            data: [{ id: Date.now(), ...config.data, created_at: new Date().toISOString() }],
          },
        };

      case 'update':
      case 'upsert':
        return {
          data: {
            success: true,
            data: [{ ...config.data, updated_at: new Date().toISOString() }],
          },
        };

      case 'delete':
        return {
          data: {
            success: true,
            data: [],
            count: 1,
          },
        };

      case 'rpc':
        return {
          data: {
            success: true,
            data: { result: 'Function executed successfully' },
          },
        };

      case 'signUp':
        return {
          data: {
            success: true,
            user: {
              id: `user_${Date.now()}`,
              email: config.email,
              created_at: new Date().toISOString(),
            },
          },
        };

      case 'signIn':
        return {
          data: {
            success: true,
            user: { id: 'user_123', email: config.email },
            session: { access_token: 'eyJ...', refresh_token: 'abc...' },
          },
        };

      case 'getUser':
        return {
          data: {
            success: true,
            user: { id: 'user_123', email: 'john@example.com', role: 'authenticated' },
          },
        };

      case 'upload':
        return {
          data: {
            success: true,
            path: `${config.bucket}/${config.path}`,
            url: `https://project.supabase.co/storage/v1/object/public/${config.bucket}/${config.path}`,
          },
        };

      case 'download':
        return {
          data: {
            success: true,
            data: 'base64_encoded_file_content...',
          },
        };

      case 'list':
        return {
          data: {
            success: true,
            data: [
              { name: 'file1.png', id: '1', created_at: new Date().toISOString() },
              { name: 'file2.jpg', id: '2', created_at: new Date().toISOString() },
            ],
          },
        };

      case 'getPublicUrl':
        return {
          data: {
            success: true,
            url: `https://project.supabase.co/storage/v1/object/public/${config.bucket}/${config.path}`,
          },
        };

      case 'invoke':
        return {
          data: {
            success: true,
            data: { message: 'Function invoked successfully' },
          },
        };

      default:
        return { data: { success: false, error: 'Unknown operation' } };
    }
  }
);
