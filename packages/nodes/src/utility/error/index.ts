import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const ErrorSchema = z.object({
  message: z.string().min(1, 'Error message is required'),
  errorCode: z.string().optional(),
  continueOnError: z.boolean().default(false),
});

export type ErrorConfig = z.infer<typeof ErrorSchema>;

export const errorNode: NodeDefinition = createNode(
  {
    type: 'utility.error',
    category: 'utility',
    name: 'Throw Error',
    description: 'Throw an error to stop workflow or handle error cases',
    icon: 'AlertTriangle',
    inputs: [
      input.string('message', 'Error Message', {
        required: true,
        description: 'The error message to throw',
        placeholder: 'An error occurred',
      }),
      input.string('errorCode', 'Error Code', {
        description: 'Optional error code for programmatic handling',
        placeholder: 'ERR_001',
      }),
      input.boolean('continueOnError', 'Continue on Error', {
        default: false,
        description: 'If true, logs error but continues execution',
      }),
    ],
    outputs: [output.main({ description: 'Operation result' })],
    defaults: {
      continueOnError: false,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = ErrorSchema.parse(nodeInput.config);
    const data = nodeInput.data;

    const errorInfo = {
      message: config.message,
      code: config.errorCode,
      data,
      timestamp: new Date().toISOString(),
    };

    if (config.continueOnError) {
      logger.error('Error node (continuing)', errorInfo);
      return {
        data: {
          error: errorInfo,
          continued: true,
        },
      };
    }

    logger.error('Error node (stopping)', errorInfo);
    throw new Error(`${config.errorCode ? `[${config.errorCode}] ` : ''}${config.message}`);
  }
);
