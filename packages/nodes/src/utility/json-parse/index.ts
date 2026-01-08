import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const JsonParseSchema = z.object({
  mode: z.enum(['parse', 'stringify']).default('parse'),
  field: z.string().optional(),
  pretty: z.boolean().default(false),
});

export type JsonParseConfig = z.infer<typeof JsonParseSchema>;

export const jsonParseNode: NodeDefinition = createNode(
  {
    type: 'utility.json-parse',
    category: 'utility',
    name: 'JSON Parse/Stringify',
    description: 'Parse JSON strings or stringify objects',
    icon: 'Braces',
    inputs: [
      input.select('mode', 'Mode', [
          { label: 'Parse (string to object)', value: 'parse' },
          { label: 'Stringify (object to string)', value: 'stringify' },
        ], {
          required: true,
          default: 'parse',
        }),
      input.string('field', 'Field', {
        description: 'Specific field to process (leave empty for entire input)',
        placeholder: 'body',
      }),
      input.boolean('pretty', 'Pretty Print', {
        default: false,
        description: 'Format JSON with indentation (stringify only)',
      }),
    ],
    outputs: [output.main({ description: 'Operation result' })],
    defaults: {
      mode: 'parse',
      pretty: false,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = JsonParseSchema.parse(nodeInput.config);
    const data = nodeInput.data as Record<string, unknown>;

    let target: unknown = data;
    if (config.field && typeof data === 'object' && data !== null) {
      target = data[config.field];
    }

    let result: unknown;

    try {
      if (config.mode === 'parse') {
        if (typeof target !== 'string') {
          throw new Error('Input must be a string to parse');
        }
        result = JSON.parse(target);
        logger.info('JSON parsed successfully');
      } else {
        const indent = config.pretty ? 2 : undefined;
        result = JSON.stringify(target, null, indent);
        logger.info('JSON stringified successfully');
      }
    } catch (error) {
      logger.error('JSON operation failed', { error: (error as Error).message });
      throw new Error(`JSON ${config.mode} failed: ${(error as Error).message}`);
    }

    return {
      data: {
        result,
        mode: config.mode,
        originalData: data,
      },
    };
  }
);
