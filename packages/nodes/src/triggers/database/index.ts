import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const DatabaseTriggerSchema = z.object({
  databaseType: z.enum(['postgres', 'mysql', 'mongodb']).default('postgres'),
  table: z.string().min(1),
  operations: z.array(z.enum(['INSERT', 'UPDATE', 'DELETE'])).default(['INSERT', 'UPDATE']),
  columns: z.array(z.string()).optional(),
  condition: z.string().optional(),
  pollingInterval: z.number().min(1000).default(5000),
  credentialId: z.string().optional(),
});

export type DatabaseTriggerConfig = z.infer<typeof DatabaseTriggerSchema>;

export const databaseTrigger: NodeDefinition = createNode(
  {
    type: 'trigger.database',
    category: 'trigger',
    name: 'Database Trigger',
    description: 'Trigger workflow on database changes (CDC pattern)',
    icon: 'Database',
    inputs: [
      input.select(
        'databaseType',
        'Database Type',
        [
          { label: 'PostgreSQL', value: 'postgres' },
          { label: 'MySQL', value: 'mysql' },
          { label: 'MongoDB', value: 'mongodb' },
        ],
        { default: 'postgres' }
      ),
      input.string('table', 'Table/Collection', {
        description: 'Table or collection name to watch',
        placeholder: 'users',
        required: true,
      }),
      input.multiSelect(
        'operations',
        'Operations',
        [
          { label: 'INSERT', value: 'INSERT' },
          { label: 'UPDATE', value: 'UPDATE' },
          { label: 'DELETE', value: 'DELETE' },
        ],
        { default: ['INSERT', 'UPDATE'] }
      ),
      input.array('columns', 'Watch Columns', {
        description: 'Specific columns to watch (empty = all columns)',
        itemType: 'string',
      }),
      input.string('condition', 'Filter Condition', {
        description: 'SQL WHERE clause or MongoDB query to filter changes',
        placeholder: "status = 'active'",
      }),
      input.number('pollingInterval', 'Polling Interval (ms)', {
        description: 'How often to check for changes',
        default: 5000,
        min: 1000,
        max: 60000,
      }),
      input.credential('credentialId', 'Database Credentials', {
        description: 'Database connection credentials',
        credentialTypes: ['DATABASE'],
        required: true,
      }),
    ],
    outputs: [output.main({ description: 'Trigger event data' })],
    defaults: {
      databaseType: 'postgres',
      table: '',
      operations: ['INSERT', 'UPDATE'],
      columns: [],
      condition: '',
      pollingInterval: 5000,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = DatabaseTriggerSchema.parse(nodeInput.config);
    const data = nodeInput.data as Record<string, unknown>;

    logger.info(`Database trigger activated: ${config.databaseType}/${config.table}`);

    // Calculate changed fields if both old and new data exist
    const oldData = (data.oldData || {}) as Record<string, unknown>;
    const newData = (data.newData || data.row || {}) as Record<string, unknown>;
    const changedFields: Record<string, { old: unknown; new: unknown }> = {};

    if (data.operation === 'UPDATE') {
      for (const key of Object.keys(newData)) {
        if (oldData[key] !== newData[key]) {
          changedFields[key] = { old: oldData[key], new: newData[key] };
        }
      }
    }

    return {
      data: {
        operation: data.operation || 'INSERT',
        newData,
        oldData,
        changedFields,
        table: config.table,
        primaryKey: data.primaryKey || data.id || '',
        timestamp: new Date().toISOString(),
        triggerType: 'database',
        databaseType: config.databaseType,
      },
    };
  }
);
