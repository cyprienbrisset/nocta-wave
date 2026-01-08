import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const FirebaseNodeSchema = z.object({
  service: z.enum(['firestore', 'realtime', 'auth', 'storage']).default('firestore'),
  operation: z.enum([
    'get', 'list', 'add', 'set', 'update', 'delete', 'query',
    'batch', 'transaction', 'listen',
    'signUp', 'signIn', 'getUser', 'updateUser', 'deleteUser', 'listUsers',
    'upload', 'download', 'getUrl', 'deleteFile'
  ]).default('get'),
  collection: z.string().optional(),
  documentId: z.string().optional(),
  path: z.string().optional(),
  data: z.record(z.unknown()).optional(),
  where: z.array(z.object({
    field: z.string(),
    operator: z.enum(['==', '!=', '<', '<=', '>', '>=', 'array-contains', 'array-contains-any', 'in', 'not-in']),
    value: z.unknown(),
  })).optional(),
  orderBy: z.object({
    field: z.string(),
    direction: z.enum(['asc', 'desc']),
  }).optional(),
  limit: z.number().optional(),
  startAfter: z.unknown().optional(),
  merge: z.boolean().default(false),
  email: z.string().optional(),
  password: z.string().optional(),
  uid: z.string().optional(),
  bucket: z.string().optional(),
  filePath: z.string().optional(),
  credentialId: z.string().optional(),
});

export type FirebaseNodeConfig = z.infer<typeof FirebaseNodeSchema>;

export const firebaseNode: NodeDefinition = createNode(
  {
    type: 'database.firebase',
    category: 'database',
    name: 'Firebase',
    description: 'Firestore, Realtime Database, Auth, and Storage',
    icon: 'Flame',
    inputs: [
      input.select(
        'service',
        'Service',
        [
          { label: 'Firestore', value: 'firestore' },
          { label: 'Realtime Database', value: 'realtime' },
          { label: 'Authentication', value: 'auth' },
          { label: 'Cloud Storage', value: 'storage' },
        ],
        { default: 'firestore' }
      ),
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Get Document', value: 'get' },
          { label: 'List Documents', value: 'list' },
          { label: 'Add Document', value: 'add' },
          { label: 'Set Document', value: 'set' },
          { label: 'Update Document', value: 'update' },
          { label: 'Delete Document', value: 'delete' },
          { label: 'Query', value: 'query' },
          { label: 'Batch Write', value: 'batch' },
          { label: 'Transaction', value: 'transaction' },
          { label: 'Sign Up', value: 'signUp' },
          { label: 'Sign In', value: 'signIn' },
          { label: 'Get User', value: 'getUser' },
          { label: 'Update User', value: 'updateUser' },
          { label: 'Delete User', value: 'deleteUser' },
          { label: 'List Users', value: 'listUsers' },
          { label: 'Upload File', value: 'upload' },
          { label: 'Download File', value: 'download' },
          { label: 'Get Download URL', value: 'getUrl' },
          { label: 'Delete File', value: 'deleteFile' },
        ],
        { default: 'get' }
      ),
      input.string('collection', 'Collection', {
        description: 'Firestore collection name',
        placeholder: 'users',
      }),
      input.string('documentId', 'Document ID', {
        description: 'Document ID',
      }),
      input.string('path', 'Path', {
        description: 'Path for Realtime Database',
        placeholder: '/users/123',
      }),
      input.json('data', 'Data', {
        description: 'Document data',
        default: {},
      }),
      input.json('where', 'Where Conditions', {
        description: 'Query filters',
        default: [],
      }),
      input.json('orderBy', 'Order By', {
        description: 'Sort order',
        default: null,
      }),
      input.number('limit', 'Limit', {
        description: 'Maximum documents to return',
      }),
      input.boolean('merge', 'Merge', {
        description: 'Merge with existing data (for set)',
        default: false,
      }),
      input.string('email', 'Email', {
        description: 'User email',
      }),
      input.string('password', 'Password', {
        description: 'User password',
      }),
      input.string('uid', 'User ID', {
        description: 'Firebase user ID',
      }),
      input.string('bucket', 'Bucket', {
        description: 'Storage bucket',
      }),
      input.string('filePath', 'File Path', {
        description: 'Path in storage bucket',
      }),
      input.credential('credentialId', 'Firebase Credentials', {
        description: 'Firebase service account or API key',
        credentialTypes: ['SERVICE_ACCOUNT', 'API_KEY'],
        required: true,
      }),
    ],
    outputs: [output.main({ description: 'Database operation result' })],
    defaults: {
      service: 'firestore',
      operation: 'get',
      data: {},
      where: [],
      merge: false,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = FirebaseNodeSchema.parse(nodeInput.config);

    logger.info(`Firebase ${config.service} ${config.operation}`);

    switch (config.operation) {
      case 'get':
        return {
          data: {
            success: true,
            document: {
              id: config.documentId,
              name: 'John Doe',
              email: 'john@example.com',
              createdAt: new Date().toISOString(),
            },
          },
        };

      case 'list':
      case 'query':
        return {
          data: {
            success: true,
            documents: [
              { id: '1', name: 'John', email: 'john@example.com' },
              { id: '2', name: 'Jane', email: 'jane@example.com' },
            ],
          },
        };

      case 'add':
        return {
          data: {
            success: true,
            id: `doc_${Date.now()}`,
            document: { id: `doc_${Date.now()}`, ...config.data },
          },
        };

      case 'set':
      case 'update':
        return {
          data: {
            success: true,
            id: config.documentId,
          },
        };

      case 'delete':
        return {
          data: {
            success: true,
            id: config.documentId,
          },
        };

      case 'batch':
        return {
          data: {
            success: true,
            writeTime: new Date().toISOString(),
          },
        };

      case 'signUp':
        return {
          data: {
            success: true,
            user: {
              uid: `user_${Date.now()}`,
              email: config.email,
              emailVerified: false,
            },
          },
        };

      case 'signIn':
        return {
          data: {
            success: true,
            user: { uid: 'user_123', email: config.email },
            token: 'eyJ...',
          },
        };

      case 'getUser':
        return {
          data: {
            success: true,
            user: {
              uid: config.uid,
              email: 'john@example.com',
              displayName: 'John Doe',
              disabled: false,
            },
          },
        };

      case 'listUsers':
        return {
          data: {
            success: true,
            users: [
              { uid: '1', email: 'john@example.com' },
              { uid: '2', email: 'jane@example.com' },
            ],
          },
        };

      case 'upload':
        return {
          data: {
            success: true,
            path: config.filePath,
            bucket: config.bucket,
          },
        };

      case 'getUrl':
        return {
          data: {
            success: true,
            url: `https://firebasestorage.googleapis.com/v0/b/${config.bucket}/o/${encodeURIComponent(config.filePath || '')}?alt=media`,
          },
        };

      case 'deleteFile':
        return {
          data: {
            success: true,
            path: config.filePath,
          },
        };

      default:
        return { data: { success: false, error: 'Unknown operation' } };
    }
  }
);
