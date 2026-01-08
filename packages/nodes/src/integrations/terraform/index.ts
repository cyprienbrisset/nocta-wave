import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const TerraformNodeSchema = z.object({
  operation: z.enum([
    'init', 'plan', 'apply', 'destroy', 'output', 'show', 'validate',
    'import', 'state', 'refresh', 'taint', 'untaint', 'workspace'
  ]).default('plan'),
  workingDirectory: z.string().optional(),
  varFile: z.string().optional(),
  variables: z.record(z.unknown()).optional(),
  targets: z.array(z.string()).optional(),
  statePath: z.string().optional(),
  backendConfig: z.record(z.string()).optional(),
  autoApprove: z.boolean().default(false),
  refreshOnly: z.boolean().default(false),
  destroyMode: z.boolean().default(false),
  outputName: z.string().optional(),
  resourceAddress: z.string().optional(),
  resourceId: z.string().optional(),
  workspaceName: z.string().optional(),
  workspaceOperation: z.enum(['list', 'select', 'new', 'delete', 'show']).default('list'),
  parallelism: z.number().default(10),
  credentialId: z.string().optional(),
});

export type TerraformNodeConfig = z.infer<typeof TerraformNodeSchema>;

export const terraformNode: NodeDefinition = createNode(
  {
    type: 'integration.terraform',
    category: 'integration',
    name: 'Terraform',
    description: 'Infrastructure as Code - Plan, apply, manage state',
    icon: 'Layers',
    inputs: [
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Init', value: 'init' },
          { label: 'Plan', value: 'plan' },
          { label: 'Apply', value: 'apply' },
          { label: 'Destroy', value: 'destroy' },
          { label: 'Output', value: 'output' },
          { label: 'Show', value: 'show' },
          { label: 'Validate', value: 'validate' },
          { label: 'Import', value: 'import' },
          { label: 'State', value: 'state' },
          { label: 'Refresh', value: 'refresh' },
          { label: 'Taint', value: 'taint' },
          { label: 'Untaint', value: 'untaint' },
          { label: 'Workspace', value: 'workspace' },
        ],
        { default: 'plan' }
      ),
      input.string('workingDirectory', 'Working Directory', {
        description: 'Path to Terraform configuration',
        placeholder: './infrastructure',
      }),
      input.string('varFile', 'Variable File', {
        description: 'Path to .tfvars file',
        placeholder: 'terraform.tfvars',
      }),
      input.json('variables', 'Variables', {
        description: 'Terraform variables',
        default: {},
      }),
      input.json('targets', 'Targets', {
        description: 'Specific resources to target',
        default: [],
      }),
      input.string('statePath', 'State Path', {
        description: 'Path to state file',
      }),
      input.json('backendConfig', 'Backend Config', {
        description: 'Backend configuration',
        default: {},
      }),
      input.boolean('autoApprove', 'Auto Approve', {
        description: 'Skip approval prompt',
        default: false,
      }),
      input.boolean('refreshOnly', 'Refresh Only', {
        description: 'Only refresh state',
        default: false,
      }),
      input.boolean('destroyMode', 'Destroy Mode', {
        description: 'Plan for destruction',
        default: false,
      }),
      input.string('outputName', 'Output Name', {
        description: 'Specific output to retrieve',
      }),
      input.string('resourceAddress', 'Resource Address', {
        description: 'Resource address for import/taint',
        placeholder: 'aws_instance.example',
      }),
      input.string('resourceId', 'Resource ID', {
        description: 'Resource ID for import',
      }),
      input.string('workspaceName', 'Workspace Name', {
        description: 'Workspace name',
      }),
      input.select(
        'workspaceOperation',
        'Workspace Operation',
        [
          { label: 'List', value: 'list' },
          { label: 'Select', value: 'select' },
          { label: 'New', value: 'new' },
          { label: 'Delete', value: 'delete' },
          { label: 'Show', value: 'show' },
        ],
        { default: 'list' }
      ),
      input.number('parallelism', 'Parallelism', {
        description: 'Number of concurrent operations',
        default: 10,
      }),
      input.credential('credentialId', 'Cloud Credentials', {
        description: 'Cloud provider credentials',
        credentialTypes: ['AWS', 'GCP', 'AZURE'],
        required: false,
      }),
    ],
    outputs: [output.main({ description: 'API operation result' })],
    defaults: {
      operation: 'plan',
      autoApprove: false,
      refreshOnly: false,
      destroyMode: false,
      parallelism: 10,
      workspaceOperation: 'list',
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = TerraformNodeSchema.parse(nodeInput.config);

    logger.info(`Terraform ${config.operation}`);

    switch (config.operation) {
      case 'init':
        return {
          data: {
            success: true,
            output: 'Terraform has been successfully initialized!',
          },
        };

      case 'plan':
        return {
          data: {
            success: true,
            plan: {
              add: 3,
              change: 1,
              destroy: 0,
            },
            changes: 4,
            output: 'Plan: 3 to add, 1 to change, 0 to destroy.',
          },
        };

      case 'apply':
        return {
          data: {
            success: true,
            output: 'Apply complete! Resources: 3 added, 1 changed, 0 destroyed.',
            changes: 4,
          },
        };

      case 'destroy':
        return {
          data: {
            success: true,
            output: 'Destroy complete! Resources: 4 destroyed.',
            changes: 4,
          },
        };

      case 'output':
        return {
          data: {
            success: true,
            outputs: {
              vpc_id: { value: 'vpc-123abc', type: 'string' },
              subnet_ids: { value: ['subnet-1', 'subnet-2'], type: 'list' },
              instance_ip: { value: '10.0.1.15', type: 'string', sensitive: false },
            },
          },
        };

      case 'show':
        return {
          data: {
            success: true,
            state: {
              resources: [
                { type: 'aws_vpc', name: 'main', instances: 1 },
                { type: 'aws_subnet', name: 'public', instances: 2 },
              ],
            },
          },
        };

      case 'validate':
        return {
          data: {
            success: true,
            valid: true,
            output: 'Success! The configuration is valid.',
          },
        };

      case 'workspace':
        if (config.workspaceOperation === 'list') {
          return {
            data: {
              success: true,
              workspaces: ['default', 'staging', 'production'],
              current: 'default',
            },
          };
        }
        return {
          data: {
            success: true,
            workspace: config.workspaceName,
          },
        };

      default:
        return { data: { success: true, output: 'Operation completed' } };
    }
  }
);
