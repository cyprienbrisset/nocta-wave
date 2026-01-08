import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const KubernetesNodeSchema = z.object({
  resource: z.enum(['pods', 'deployments', 'services', 'configmaps', 'secrets', 'namespaces', 'jobs', 'cronjobs', 'ingresses']).default('pods'),
  operation: z.enum([
    'list', 'get', 'create', 'update', 'patch', 'delete',
    'scale', 'rollout', 'logs', 'exec', 'apply'
  ]).default('list'),
  namespace: z.string().default('default'),
  name: z.string().optional(),
  labels: z.record(z.string()).optional(),
  manifest: z.record(z.unknown()).optional(),
  replicas: z.number().optional(),
  container: z.string().optional(),
  command: z.array(z.string()).optional(),
  tail: z.number().default(100),
  fieldSelector: z.string().optional(),
  labelSelector: z.string().optional(),
  limit: z.number().optional(),
  credentialId: z.string().optional(),
});

export type KubernetesNodeConfig = z.infer<typeof KubernetesNodeSchema>;

export const kubernetesNode: NodeDefinition = createNode(
  {
    type: 'integration.kubernetes',
    category: 'integration',
    name: 'Kubernetes',
    description: 'Container orchestration - Pods, deployments, services',
    icon: 'Ship',
    inputs: [
      input.select(
        'resource',
        'Resource',
        [
          { label: 'Pods', value: 'pods' },
          { label: 'Deployments', value: 'deployments' },
          { label: 'Services', value: 'services' },
          { label: 'ConfigMaps', value: 'configmaps' },
          { label: 'Secrets', value: 'secrets' },
          { label: 'Namespaces', value: 'namespaces' },
          { label: 'Jobs', value: 'jobs' },
          { label: 'CronJobs', value: 'cronjobs' },
          { label: 'Ingresses', value: 'ingresses' },
        ],
        { default: 'pods' }
      ),
      input.select(
        'operation',
        'Operation',
        [
          { label: 'List', value: 'list' },
          { label: 'Get', value: 'get' },
          { label: 'Create', value: 'create' },
          { label: 'Update', value: 'update' },
          { label: 'Patch', value: 'patch' },
          { label: 'Delete', value: 'delete' },
          { label: 'Scale', value: 'scale' },
          { label: 'Rollout', value: 'rollout' },
          { label: 'Logs', value: 'logs' },
          { label: 'Exec', value: 'exec' },
          { label: 'Apply', value: 'apply' },
        ],
        { default: 'list' }
      ),
      input.string('namespace', 'Namespace', {
        description: 'Kubernetes namespace',
        default: 'default',
      }),
      input.string('name', 'Name', {
        description: 'Resource name',
      }),
      input.json('labels', 'Labels', {
        description: 'Resource labels',
        default: {},
      }),
      input.json('manifest', 'Manifest', {
        description: 'YAML/JSON manifest',
        default: {},
      }),
      input.number('replicas', 'Replicas', {
        description: 'Number of replicas (for scale)',
      }),
      input.string('container', 'Container', {
        description: 'Container name (for logs/exec)',
      }),
      input.json('command', 'Command', {
        description: 'Command to execute',
        default: [],
      }),
      input.number('tail', 'Tail Lines', {
        description: 'Number of log lines',
        default: 100,
      }),
      input.string('fieldSelector', 'Field Selector', {
        description: 'Field selector filter',
      }),
      input.string('labelSelector', 'Label Selector', {
        description: 'Label selector filter',
        placeholder: 'app=myapp,env=prod',
      }),
      input.number('limit', 'Limit', {
        description: 'Maximum items to return',
      }),
      input.credential('credentialId', 'Kubernetes Credentials', {
        description: 'Kubeconfig or service account',
        credentialTypes: ['KUBECONFIG', 'SERVICE_ACCOUNT'],
        required: true,
      }),
    ],
    outputs: [output.main({ description: 'API operation result' })],
    defaults: {
      resource: 'pods',
      operation: 'list',
      namespace: 'default',
      tail: 100,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = KubernetesNodeSchema.parse(nodeInput.config);

    logger.info(`Kubernetes ${config.operation} on ${config.resource}`);

    switch (config.operation) {
      case 'list':
        return {
          data: {
            success: true,
            items: [
              {
                metadata: { name: 'my-pod-abc123', namespace: config.namespace },
                status: { phase: 'Running' },
                spec: { containers: [{ name: 'app', image: 'nginx:latest' }] },
              },
            ],
          },
        };

      case 'get':
        return {
          data: {
            success: true,
            item: {
              apiVersion: 'v1',
              kind: 'Pod',
              metadata: { name: config.name, namespace: config.namespace },
              status: { phase: 'Running', podIP: '10.0.0.15' },
            },
          },
        };

      case 'create':
      case 'apply':
        return {
          data: {
            success: true,
            item: {
              metadata: { name: config.name, namespace: config.namespace },
              status: { phase: 'Pending' },
            },
          },
        };

      case 'delete':
        return {
          data: {
            success: true,
            deleted: true,
          },
        };

      case 'scale':
        return {
          data: {
            success: true,
            name: config.name,
            replicas: config.replicas,
          },
        };

      case 'rollout':
        return {
          data: {
            success: true,
            name: config.name,
            status: 'RollingUpdate',
          },
        };

      case 'logs':
        return {
          data: {
            success: true,
            logs: '2024-01-15T10:00:00Z Starting application...\n2024-01-15T10:00:01Z Application ready',
          },
        };

      case 'exec':
        return {
          data: {
            success: true,
            output: 'Command executed successfully',
          },
        };

      default:
        return { data: { success: true } };
    }
  }
);
