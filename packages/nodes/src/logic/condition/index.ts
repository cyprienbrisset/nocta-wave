import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const ConditionSchema = z.object({
  condition: z.string().min(1, 'Condition is required'),
  combineWith: z.enum(['AND', 'OR']).default('AND'),
});

export type ConditionConfig = z.infer<typeof ConditionSchema>;

export const conditionNode: NodeDefinition = createNode(
  {
    type: 'logic.condition',
    category: 'logic',
    name: 'IF Condition',
    description: 'Branch workflow based on a condition (if/else)',
    icon: 'GitBranch',
    inputs: [
      input.code('condition', 'Condition', {
        required: true,
        description: 'JavaScript expression that returns true/false. Access input data via "data".',
        placeholder: 'data.status === "active" && data.count > 0',
      }),
    ],
    outputs: [
      output.true({ description: 'Données envoyées si la condition est vraie' }),
      output.false({ description: 'Données envoyées si la condition est fausse' }),
    ],
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = ConditionSchema.parse(nodeInput.config);
    const data = nodeInput.data;

    logger.info('Condition node: evaluating');

    let result: boolean;

    try {
      const fn = new Function('data', `return (${config.condition})`);
      result = Boolean(fn(data));
    } catch (error) {
      logger.error('Condition evaluation failed', { error: (error as Error).message });
      throw new Error(`Condition evaluation failed: ${(error as Error).message}`);
    }

    logger.info(`Condition result: ${result}`);

    return {
      data: {
        __isCondition: true,
        result,
        data,
        outputHandle: result ? 'true' : 'false',
      },
    };
  }
);
