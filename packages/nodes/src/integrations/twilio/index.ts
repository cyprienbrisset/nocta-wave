import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const TwilioSchema = z.object({
  operation: z.enum(['sendSms', 'sendWhatsapp', 'makeCall', 'listMessages']).default('sendSms'),
  to: z.string().optional(),
  from: z.string().optional(),
  body: z.string().optional(),
  url: z.string().optional(),
});

export const twilioNode: NodeDefinition = createNode(
  {
    type: 'integration.twilio',
    category: 'integration',
    name: 'Twilio',
    description: 'Send SMS, WhatsApp messages, and make calls',
    icon: 'Phone',
    inputs: [
      input.select('operation', 'Operation', [
        { label: 'Send SMS', value: 'sendSms' },
        { label: 'Send WhatsApp', value: 'sendWhatsapp' },
        { label: 'Make Call', value: 'makeCall' },
        { label: 'List Messages', value: 'listMessages' },
      ], { default: 'sendSms' }),
      input.string('to', 'To', { description: 'Recipient phone number' }),
      input.string('from', 'From', { description: 'Your Twilio phone number' }),
      input.string('body', 'Message', { description: 'Message body' }),
      input.string('url', 'TwiML URL', { description: 'URL for call instructions' }),
    ],
    outputs: [output.object('result', 'Twilio API response')],
    credentials: ['custom'],
  },
  async (nodeInput, context) => {
    const config = TwilioSchema.parse(nodeInput.config);
    context.logger.info(`Twilio: ${config.operation}`);
    return { data: { result: {}, __needsExecution: true } };
  }
);
