import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const LogSchema = z.object({
  message: z.string().optional(),
  level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  includeData: z.boolean().default(true),
});

export type LogConfig = z.infer<typeof LogSchema>;

export const logNode: NodeDefinition = createNode(
  {
    type: 'utility.log',
    category: 'utility',
    name: 'Log',
    description: 'Log data and messages for debugging',
    icon: 'FileText',
    inputs: [
      input.string('message', 'Message', {
        description: 'Optional message to log',
        placeholder: 'Processing item...',
      }),
      input.select('level', 'Log Level', [
          { label: 'Debug', value: 'debug' },
          { label: 'Info', value: 'info' },
          { label: 'Warn', value: 'warn' },
          { label: 'Error', value: 'error' },
        ], {
          default: 'info',
        }),
      input.boolean('includeData', 'Include Input Data', {
        default: true,
        description: 'Include input data in log output',
      }),
    ],
    outputs: [output.object('output', 'Passes through input data unchanged')],
    defaults: {
      level: 'info',
      includeData: true,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = LogSchema.parse(nodeInput.config);
    const data = nodeInput.data;

    const logData = config.includeData
      ? { message: config.message, data }
      : { message: config.message };

    switch (config.level) {
      case 'debug':
        logger.debug(config.message || 'Log node', logData);
        break;
      case 'info':
        logger.info(config.message || 'Log node', logData);
        break;
      case 'warn':
        logger.warn(config.message || 'Log node', logData);
        break;
      case 'error':
        logger.error(config.message || 'Log node', logData);
        break;
    }

    // Pass through data unchanged
    return {
      data: {
        logged: true,
        level: config.level,
        message: config.message,
        originalData: data,
      },
    };
  }
);
