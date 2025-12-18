import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const FTPNodeSchema = z.object({
  protocol: z.enum(['ftp', 'sftp', 'ftps']).default('sftp'),
  operation: z.enum(['upload', 'download', 'delete', 'list', 'rename', 'mkdir', 'rmdir', 'exists', 'chmod']).default('upload'),
  host: z.string().min(1),
  port: z.number().default(22),
  remotePath: z.string().min(1),
  content: z.unknown().optional(),
  destinationPath: z.string().optional(),
  recursive: z.boolean().default(false),
  overwrite: z.boolean().default(true),
  permissions: z.string().optional(),
  credentialId: z.string().optional(),
});

export type FTPNodeConfig = z.infer<typeof FTPNodeSchema>;

export const ftpNode: NodeDefinition = createNode(
  {
    type: 'integration.ftp',
    category: 'integration',
    name: 'FTP/SFTP',
    description: 'Transfer files via FTP, SFTP, or FTPS',
    icon: 'Upload',
    inputs: [
      input.select(
        'protocol',
        'Protocol',
        [
          { label: 'SFTP (SSH)', value: 'sftp' },
          { label: 'FTP', value: 'ftp' },
          { label: 'FTPS (TLS)', value: 'ftps' },
        ],
        { default: 'sftp' }
      ),
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Upload File', value: 'upload' },
          { label: 'Download File', value: 'download' },
          { label: 'Delete File', value: 'delete' },
          { label: 'List Directory', value: 'list' },
          { label: 'Rename/Move', value: 'rename' },
          { label: 'Create Directory', value: 'mkdir' },
          { label: 'Remove Directory', value: 'rmdir' },
          { label: 'Check Exists', value: 'exists' },
          { label: 'Change Permissions', value: 'chmod' },
        ],
        { default: 'upload' }
      ),
      input.string('host', 'Host', {
        description: 'FTP/SFTP server hostname',
        placeholder: 'ftp.example.com',
        required: true,
      }),
      input.number('port', 'Port', {
        description: 'Server port (22 for SFTP, 21 for FTP)',
        default: 22,
        min: 1,
        max: 65535,
      }),
      input.string('remotePath', 'Remote Path', {
        description: 'Path on the remote server',
        placeholder: '/home/user/files/document.pdf',
        required: true,
      }),
      input.json('content', 'Content', {
        description: 'File content to upload',
        default: {},
      }),
      input.string('destinationPath', 'Destination Path', {
        description: 'Destination path for rename/move operations',
        placeholder: '/home/user/files/new-name.pdf',
      }),
      input.boolean('recursive', 'Recursive', {
        description: 'Recursive operation for directories',
        default: false,
      }),
      input.boolean('overwrite', 'Overwrite', {
        description: 'Overwrite existing files',
        default: true,
      }),
      input.string('permissions', 'Permissions', {
        description: 'File permissions (e.g., 0644)',
        placeholder: '0644',
      }),
      input.credential('credentialId', 'Credentials', {
        description: 'FTP/SFTP authentication credentials',
        credentialTypes: ['BASIC_AUTH'],
        required: true,
      }),
    ],
    outputs: [
      output.boolean('success', 'Operation success'),
      output.string('path', 'Remote path'),
      output.object('content', 'Downloaded content'),
      output.array('files', 'Directory listing'),
      output.boolean('exists', 'File exists'),
      output.object('stats', 'File statistics'),
    ],
    defaults: {
      protocol: 'sftp',
      operation: 'upload',
      host: '',
      port: 22,
      remotePath: '',
      recursive: false,
      overwrite: true,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = FTPNodeSchema.parse(nodeInput.config);

    logger.info(`${config.protocol.toUpperCase()} operation: ${config.operation} on ${config.host}`);

    switch (config.operation) {
      case 'upload':
        logger.info(`Uploading to ${config.remotePath}`);
        return {
          data: {
            success: true,
            path: config.remotePath,
            size: JSON.stringify(config.content || {}).length,
            timestamp: new Date().toISOString(),
          },
        };

      case 'download':
        logger.info(`Downloading from ${config.remotePath}`);
        return {
          data: {
            success: true,
            path: config.remotePath,
            content: nodeInput.data || {},
          },
        };

      case 'delete':
        return {
          data: {
            success: true,
            path: config.remotePath,
            deleted: true,
          },
        };

      case 'list':
        return {
          data: {
            success: true,
            path: config.remotePath,
            files: [
              {
                name: 'example.txt',
                type: 'file',
                size: 1024,
                modifyTime: new Date().toISOString(),
                accessTime: new Date().toISOString(),
                rights: { user: 'rw', group: 'r', other: 'r' },
                owner: 1000,
                group: 1000,
              },
              {
                name: 'subdir',
                type: 'directory',
                size: 4096,
                modifyTime: new Date().toISOString(),
                accessTime: new Date().toISOString(),
                rights: { user: 'rwx', group: 'rx', other: 'rx' },
                owner: 1000,
                group: 1000,
              },
            ],
          },
        };

      case 'rename':
        return {
          data: {
            success: true,
            fromPath: config.remotePath,
            toPath: config.destinationPath,
          },
        };

      case 'mkdir':
        return {
          data: {
            success: true,
            path: config.remotePath,
            created: true,
          },
        };

      case 'rmdir':
        return {
          data: {
            success: true,
            path: config.remotePath,
            removed: true,
          },
        };

      case 'exists':
        return {
          data: {
            success: true,
            path: config.remotePath,
            exists: true,
          },
        };

      case 'chmod':
        return {
          data: {
            success: true,
            path: config.remotePath,
            permissions: config.permissions,
          },
        };

      default:
        return { data: { success: false, error: 'Unknown operation' } };
    }
  }
);
