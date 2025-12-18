import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const DebugSchema = z.object({
  breakpoint: z.boolean().default(false),
  showType: z.boolean().default(true),
  showKeys: z.boolean().default(true),
});

export type DebugConfig = z.infer<typeof DebugSchema>;

export const debugNode: NodeDefinition = createNode(
  {
    type: 'utility.debug',
    category: 'utility',
    name: 'Debug',
    description: 'Inspect data structure and types for debugging',
    icon: 'Bug',
    inputs: [
      input.boolean('breakpoint', 'Pause Execution', {
        default: false,
        description: 'Pause execution at this node (for debugging)',
      }),
      input.boolean('showType', 'Show Data Types', {
        default: true,
        description: 'Include type information in output',
      }),
      input.boolean('showKeys', 'Show Object Keys', {
        default: true,
        description: 'List all keys if input is an object',
      }),
    ],
    outputs: [output.object('output', 'Debug information about the input data')],
    defaults: {
      breakpoint: false,
      showType: true,
      showKeys: true,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = DebugSchema.parse(nodeInput.config);
    const data = nodeInput.data;

    const debugInfo: Record<string, unknown> = {
      value: data,
    };

    if (config.showType) {
      debugInfo.type = typeof data;
      debugInfo.isArray = Array.isArray(data);
      debugInfo.isNull = data === null;
      debugInfo.isUndefined = data === undefined;
    }

    if (config.showKeys && typeof data === 'object' && data !== null) {
      const keys = Object.keys(data as object);
      debugInfo.keys = keys;
      debugInfo.keyCount = keys.length;
    }

    if (Array.isArray(data)) {
      debugInfo.length = data.length;
      debugInfo.firstItem = data[0];
      debugInfo.lastItem = data[data.length - 1];
    }

    if (typeof data === 'string') {
      debugInfo.length = data.length;
      debugInfo.isEmpty = data.length === 0;
    }

    logger.info('Debug node inspection', debugInfo);

    return {
      data: {
        debug: debugInfo,
        originalData: data,
      },
    };
  }
);
