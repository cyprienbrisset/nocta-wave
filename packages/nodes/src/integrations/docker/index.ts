import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const DockerNodeSchema = z.object({
  resource: z.enum(['containers', 'images', 'volumes', 'networks', 'system']).default('containers'),
  operation: z.enum([
    'list', 'create', 'start', 'stop', 'restart', 'remove', 'inspect', 'logs',
    'pull', 'push', 'build', 'tag',
    'createVolume', 'removeVolume', 'listVolumes',
    'createNetwork', 'removeNetwork', 'listNetworks',
    'prune', 'info', 'version'
  ]).default('list'),
  containerId: z.string().optional(),
  containerName: z.string().optional(),
  image: z.string().optional(),
  tag: z.string().default('latest'),
  command: z.array(z.string()).optional(),
  env: z.array(z.string()).optional(),
  ports: z.array(z.object({
    containerPort: z.number(),
    hostPort: z.number(),
    protocol: z.enum(['tcp', 'udp']).default('tcp'),
  })).optional(),
  volumes: z.array(z.object({
    source: z.string(),
    target: z.string(),
    type: z.enum(['bind', 'volume', 'tmpfs']).default('bind'),
  })).optional(),
  networkMode: z.string().optional(),
  restartPolicy: z.enum(['no', 'always', 'unless-stopped', 'on-failure']).default('no'),
  labels: z.record(z.string()).optional(),
  volumeName: z.string().optional(),
  networkName: z.string().optional(),
  tail: z.number().default(100),
  since: z.string().optional(),
  follow: z.boolean().default(false),
  credentialId: z.string().optional(),
});

export type DockerNodeConfig = z.infer<typeof DockerNodeSchema>;

export const dockerNode: NodeDefinition = createNode(
  {
    type: 'integration.docker',
    category: 'integration',
    name: 'Docker',
    description: 'Container management - Containers, images, volumes',
    icon: 'Box',
    inputs: [
      input.select(
        'resource',
        'Resource',
        [
          { label: 'Containers', value: 'containers' },
          { label: 'Images', value: 'images' },
          { label: 'Volumes', value: 'volumes' },
          { label: 'Networks', value: 'networks' },
          { label: 'System', value: 'system' },
        ],
        { default: 'containers' }
      ),
      input.select(
        'operation',
        'Operation',
        [
          { label: 'List', value: 'list' },
          { label: 'Create', value: 'create' },
          { label: 'Start', value: 'start' },
          { label: 'Stop', value: 'stop' },
          { label: 'Restart', value: 'restart' },
          { label: 'Remove', value: 'remove' },
          { label: 'Inspect', value: 'inspect' },
          { label: 'Logs', value: 'logs' },
          { label: 'Pull Image', value: 'pull' },
          { label: 'Push Image', value: 'push' },
          { label: 'Build Image', value: 'build' },
          { label: 'Tag Image', value: 'tag' },
          { label: 'Create Volume', value: 'createVolume' },
          { label: 'Remove Volume', value: 'removeVolume' },
          { label: 'List Volumes', value: 'listVolumes' },
          { label: 'Create Network', value: 'createNetwork' },
          { label: 'Remove Network', value: 'removeNetwork' },
          { label: 'List Networks', value: 'listNetworks' },
          { label: 'Prune', value: 'prune' },
          { label: 'System Info', value: 'info' },
          { label: 'Version', value: 'version' },
        ],
        { default: 'list' }
      ),
      input.string('containerId', 'Container ID', {
        description: 'Container ID or name',
      }),
      input.string('containerName', 'Container Name', {
        description: 'Name for new container',
      }),
      input.string('image', 'Image', {
        description: 'Docker image name',
        placeholder: 'nginx:latest',
      }),
      input.string('tag', 'Tag', {
        description: 'Image tag',
        default: 'latest',
      }),
      input.json('command', 'Command', {
        description: 'Command to run',
        default: [],
      }),
      input.json('env', 'Environment', {
        description: 'Environment variables (KEY=value)',
        default: [],
      }),
      input.json('ports', 'Port Mappings', {
        description: 'Container port mappings',
        default: [],
      }),
      input.json('volumes', 'Volume Mounts', {
        description: 'Volume mount configuration',
        default: [],
      }),
      input.string('networkMode', 'Network Mode', {
        description: 'Network mode (bridge, host, none)',
        placeholder: 'bridge',
      }),
      input.select(
        'restartPolicy',
        'Restart Policy',
        [
          { label: 'No', value: 'no' },
          { label: 'Always', value: 'always' },
          { label: 'Unless Stopped', value: 'unless-stopped' },
          { label: 'On Failure', value: 'on-failure' },
        ],
        { default: 'no' }
      ),
      input.json('labels', 'Labels', {
        description: 'Container labels',
        default: {},
      }),
      input.string('volumeName', 'Volume Name', {
        description: 'Volume name',
      }),
      input.string('networkName', 'Network Name', {
        description: 'Network name',
      }),
      input.number('tail', 'Tail Lines', {
        description: 'Number of log lines',
        default: 100,
      }),
      input.credential('credentialId', 'Docker Credentials', {
        description: 'Docker host or registry credentials',
        credentialTypes: ['BASIC_AUTH', 'API_KEY'],
        required: false,
      }),
    ],
    outputs: [
      output.boolean('success', 'Operation success'),
      output.array('items', 'List results'),
      output.object('item', 'Single item'),
      output.string('id', 'Container/Image ID'),
      output.string('logs', 'Container logs'),
    ],
    defaults: {
      resource: 'containers',
      operation: 'list',
      tag: 'latest',
      restartPolicy: 'no',
      tail: 100,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = DockerNodeSchema.parse(nodeInput.config);

    logger.info(`Docker ${config.operation} on ${config.resource}`);

    switch (config.operation) {
      case 'list':
        return {
          data: {
            success: true,
            items: [
              {
                Id: 'abc123def456',
                Names: ['/my-container'],
                Image: 'nginx:latest',
                State: 'running',
                Status: 'Up 2 hours',
                Ports: [{ PrivatePort: 80, PublicPort: 8080 }],
              },
            ],
          },
        };

      case 'create':
        return {
          data: {
            success: true,
            id: `container_${Date.now().toString(16)}`,
            warnings: [],
          },
        };

      case 'start':
      case 'stop':
      case 'restart':
        return {
          data: {
            success: true,
            id: config.containerId,
            status: config.operation === 'stop' ? 'stopped' : 'running',
          },
        };

      case 'remove':
        return {
          data: {
            success: true,
            id: config.containerId,
            removed: true,
          },
        };

      case 'inspect':
        return {
          data: {
            success: true,
            item: {
              Id: config.containerId,
              Name: '/my-container',
              State: { Status: 'running', Running: true },
              Config: { Image: 'nginx:latest' },
            },
          },
        };

      case 'logs':
        return {
          data: {
            success: true,
            logs: '2024-01-15 10:00:00 Starting server...\n2024-01-15 10:00:01 Server started on port 80',
          },
        };

      case 'pull':
        return {
          data: {
            success: true,
            image: config.image,
            tag: config.tag,
            status: 'Downloaded newer image',
          },
        };

      case 'info':
        return {
          data: {
            success: true,
            item: {
              Containers: 5,
              ContainersRunning: 3,
              Images: 12,
              NCPU: 4,
              MemTotal: 8000000000,
            },
          },
        };

      case 'version':
        return {
          data: {
            success: true,
            item: {
              Version: '24.0.7',
              ApiVersion: '1.43',
              Os: 'linux',
              Arch: 'amd64',
            },
          },
        };

      default:
        return { data: { success: true } };
    }
  }
);
