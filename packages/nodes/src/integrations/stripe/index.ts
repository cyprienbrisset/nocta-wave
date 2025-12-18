import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const StripeSchema = z.object({
  operation: z.enum(['createCustomer', 'getCustomer', 'createPaymentIntent', 'listPayments', 'createInvoice', 'listSubscriptions']).default('listPayments'),
  customerId: z.string().optional(),
  email: z.string().optional(),
  name: z.string().optional(),
  amount: z.number().optional(),
  currency: z.string().default('usd'),
  description: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

export const stripeNode: NodeDefinition = createNode(
  {
    type: 'integration.stripe',
    category: 'integration',
    name: 'Stripe',
    description: 'Process payments and manage customers with Stripe',
    icon: 'CreditCard',
    inputs: [
      input.select('operation', 'Operation', [
        { label: 'Create Customer', value: 'createCustomer' },
        { label: 'Get Customer', value: 'getCustomer' },
        { label: 'Create Payment Intent', value: 'createPaymentIntent' },
        { label: 'List Payments', value: 'listPayments' },
        { label: 'Create Invoice', value: 'createInvoice' },
        { label: 'List Subscriptions', value: 'listSubscriptions' },
      ], { default: 'listPayments' }),
      input.string('customerId', 'Customer ID', {}),
      input.string('email', 'Email', {}),
      input.string('name', 'Name', {}),
      input.number('amount', 'Amount', { description: 'Amount in cents' }),
      input.string('currency', 'Currency', { default: 'usd' }),
      input.string('description', 'Description', {}),
      input.json('metadata', 'Metadata', {}),
    ],
    outputs: [output.object('result', 'Stripe API response')],
    credentials: ['api_key'],
  },
  async (nodeInput, context) => {
    const config = StripeSchema.parse(nodeInput.config);
    context.logger.info(`Stripe: ${config.operation}`);
    return { data: { result: {}, __needsExecution: true } };
  }
);
