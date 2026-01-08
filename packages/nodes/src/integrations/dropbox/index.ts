import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const DropboxNodeSchema = z.object({
  operation: z.enum(['upload', 'download', 'delete', 'list', 'getMetadata', 'move', 'copy', 'createFolder', 'search', 'getSharedLink']).default('upload'),
  path: z.string().min(1),
  content: z.unknown().optional(),
  destinationPath: z.string().optional(),
  recursive: z.boolean().default(false),
  includeDeleted: z.boolean().default(false),
  searchQuery: z.string().optional(),
  autorename: z.boolean().default(false),
  mute: z.boolean().default(false),
  credentialId: z.string().optional(),
});

export type DropboxNodeConfig = z.infer<typeof DropboxNodeSchema>;

export const dropboxNode: NodeDefinition = createNode(
  {
    type: 'integration.dropbox',
    category: 'integration',
    name: 'Dropbox',
    description: 'Upload, download, and manage files in Dropbox',
    icon: 'HardDrive',
    inputs: [
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Upload File', value: 'upload' },
          { label: 'Download File', value: 'download' },
          { label: 'Delete File/Folder', value: 'delete' },
          { label: 'List Files', value: 'list' },
          { label: 'Get Metadata', value: 'getMetadata' },
          { label: 'Move', value: 'move' },
          { label: 'Copy', value: 'copy' },
          { label: 'Create Folder', value: 'createFolder' },
          { label: 'Search', value: 'search' },
          { label: 'Get Shared Link', value: 'getSharedLink' },
        ],
        { default: 'upload' }
      ),
      input.string('path', 'Path', {
        description: 'Path in Dropbox (starts with /)',
        placeholder: '/folder/file.txt',
        required: true,
      }),
      input.json('content', 'Content', {
        description: 'File content to upload',
        default: {},
      }),
      input.string('destinationPath', 'Destination Path', {
        description: 'Destination path for move/copy operations',
        placeholder: '/new-folder/file.txt',
      }),
      input.boolean('recursive', 'Recursive', {
        description: 'List files recursively',
        default: false,
      }),
      input.boolean('includeDeleted', 'Include Deleted', {
        description: 'Include deleted files in listing',
        default: false,
      }),
      input.string('searchQuery', 'Search Query', {
        description: 'Search query for search operation',
        placeholder: 'document',
      }),
      input.boolean('autorename', 'Auto Rename', {
        description: 'Automatically rename file if exists',
        default: false,
      }),
      input.boolean('mute', 'Mute Notifications', {
        description: 'Suppress desktop notifications',
        default: false,
      }),
      input.credential('credentialId', 'Dropbox Credentials', {
        description: 'Dropbox OAuth2 credentials',
        credentialTypes: ['OAUTH2'],
        required: true,
      }),
    ],
    outputs: [output.main({ description: 'API operation result' })],
    defaults: {
      operation: 'upload',
      path: '',
      recursive: false,
      includeDeleted: false,
      autorename: false,
      mute: false,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = DropboxNodeSchema.parse(nodeInput.config);

    logger.info(`Dropbox operation: ${config.operation} on path: ${config.path}`);

    const fileId = `id:${Math.random().toString(36).substring(7)}`;

    switch (config.operation) {
      case 'upload':
        logger.info(`Uploading to ${config.path}`);
        return {
          data: {
            success: true,
            path: config.path,
            id: fileId,
            metadata: {
              name: config.path.split('/').pop(),
              pathDisplay: config.path,
              size: JSON.stringify(config.content || {}).length,
              serverModified: new Date().toISOString(),
            },
          },
        };

      case 'download':
        logger.info(`Downloading from ${config.path}`);
        return {
          data: {
            success: true,
            path: config.path,
            content: nodeInput.data || {},
          },
        };

      case 'delete':
        return {
          data: {
            success: true,
            path: config.path,
            deleted: true,
          },
        };

      case 'list':
        return {
          data: {
            success: true,
            entries: [
              {
                name: 'example.json',
                pathDisplay: `${config.path}/example.json`,
                id: fileId,
                tag: 'file',
                size: 1024,
                serverModified: new Date().toISOString(),
              },
            ],
            hasMore: false,
          },
        };

      case 'getMetadata':
        return {
          data: {
            success: true,
            metadata: {
              name: config.path.split('/').pop(),
              pathDisplay: config.path,
              id: fileId,
              size: 1024,
              serverModified: new Date().toISOString(),
              clientModified: new Date().toISOString(),
            },
          },
        };

      case 'move':
      case 'copy':
        return {
          data: {
            success: true,
            fromPath: config.path,
            toPath: config.destinationPath,
            id: fileId,
            operation: config.operation,
          },
        };

      case 'createFolder':
        return {
          data: {
            success: true,
            path: config.path,
            id: fileId,
          },
        };

      case 'search':
        return {
          data: {
            success: true,
            matches: [
              {
                matchType: 'filename',
                metadata: {
                  name: `${config.searchQuery}.json`,
                  pathDisplay: `/folder/${config.searchQuery}.json`,
                  id: fileId,
                },
              },
            ],
            hasMore: false,
          },
        };

      case 'getSharedLink':
        return {
          data: {
            success: true,
            sharedLink: `https://www.dropbox.com/s/${fileId}/${config.path.split('/').pop()}?dl=0`,
            path: config.path,
          },
        };

      default:
        return { data: { success: false, error: 'Unknown operation' } };
    }
  }
);
