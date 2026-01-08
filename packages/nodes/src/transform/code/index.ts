import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const CodeSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  mode: z.enum(['expression', 'function']).default('expression'),
});

export type CodeConfig = z.infer<typeof CodeSchema>;

export const codeNode: NodeDefinition = createNode(
  {
    type: 'transform.code',
    category: 'transform',
    name: 'Code',
    description: 'Execute custom JavaScript code',
    icon: 'Code',
    inputs: [
      input.code('code', 'Code', {
        required: true,
        description: 'JavaScript code to execute. Access input data via "data" variable.',
        placeholder: `// Expression mode: return a value
data.items.map(item => ({
  ...item,
  processed: true
}))

// Function mode: full function body
const result = [];
for (const item of data.items) {
  result.push({ ...item, processed: true });
}
return result;`,
      }),
      input.select(
        'mode',
        'Mode',
        [
          { label: 'Expression', value: 'expression' },
          { label: 'Function Body', value: 'function' },
        ],
        {
          default: 'expression',
          description: 'Expression: return a single value. Function: full function body with return.',
        }
      ),
    ],
    outputs: [output.main({ description: 'Operation result' })],
    defaults: {
      mode: 'expression',
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = CodeSchema.parse(nodeInput.config);
    const data = nodeInput.data;

    logger.info('Code node: executing custom code');

    let result: unknown;

    try {
      if (config.mode === 'expression') {
        // Expression mode: wrap in return
        const fn = new Function('data', 'context', `return (${config.code})`);
        result = fn(data, { logger });
      } else {
        // Function mode: execute as full function body
        const fn = new Function('data', 'context', config.code);
        result = fn(data, { logger });
      }

      logger.info('Code execution completed');
    } catch (error) {
      logger.error('Code execution failed', { error: (error as Error).message });
      throw new Error(`Code execution failed: ${(error as Error).message}`);
    }

    return { data: result };
  }
);
