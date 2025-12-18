import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const SetSchema = z.object({
  mode: z.enum(['set', 'append', 'remove']).default('set'),
  values: z
    .array(
      z.object({
        key: z.string(),
        value: z.unknown(),
      })
    )
    .default([]),
  keepOnlySet: z.boolean().default(false),
});

export type SetConfig = z.infer<typeof SetSchema>;

export const setNode: NodeDefinition = createNode(
  {
    type: 'transform.set',
    category: 'transform',
    name: 'Set',
    description: 'Set, modify, or remove fields in the data',
    icon: 'Pencil',
    inputs: [
      input.select(
        'mode',
        'Mode',
        [
          { label: 'Set/Replace', value: 'set' },
          { label: 'Append', value: 'append' },
          { label: 'Remove', value: 'remove' },
        ],
        { default: 'set' }
      ),
      input.keyValue('values', 'Values', {
        required: true,
        description: 'Key-value pairs to set or remove',
      }),
      input.boolean('keepOnlySet', 'Keep Only Set Fields', {
        default: false,
        description: 'Remove all fields except the ones being set',
      }),
    ],
    outputs: [output.object('data', 'Modified data')],
    defaults: {
      mode: 'set',
      keepOnlySet: false,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = SetSchema.parse(nodeInput.config);
    const inputData = (nodeInput.data as Record<string, unknown>) || {};

    logger.info(`Set node: ${config.mode} mode`);

    let result: Record<string, unknown>;

    if (config.keepOnlySet) {
      result = {};
    } else {
      result = { ...inputData };
    }

    for (const { key, value } of config.values) {
      if (config.mode === 'remove') {
        delete result[key];
      } else if (config.mode === 'append' && Array.isArray(result[key])) {
        (result[key] as unknown[]).push(value);
      } else {
        result[key] = value;
      }
    }

    return { data: result };
  }
);
