import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const SendgridSchema = z.object({
  operation: z.enum(['sendEmail', 'sendTemplate']).default('sendEmail'),
  to: z.string(),
  from: z.string(),
  subject: z.string().optional(),
  text: z.string().optional(),
  html: z.string().optional(),
  templateId: z.string().optional(),
  dynamicData: z.record(z.unknown()).optional(),
});

export const sendgridNode: NodeDefinition = createNode(
  {
    type: 'integration.sendgrid',
    category: 'integration',
    name: 'SendGrid',
    description: 'Send transactional emails with SendGrid',
    icon: 'Mail',
    inputs: [
      input.select('operation', 'Operation', [
        { label: 'Send Email', value: 'sendEmail' },
        { label: 'Send Template', value: 'sendTemplate' },
      ], { default: 'sendEmail' }),
      input.string('to', 'To', { required: true, description: 'Recipient email' }),
      input.string('from', 'From', { required: true, description: 'Sender email' }),
      input.string('subject', 'Subject', {}),
      input.string('text', 'Text Content', {}),
      input.code('html', 'HTML Content', {}),
      input.string('templateId', 'Template ID', {}),
      input.json('dynamicData', 'Dynamic Data', { description: 'Template variables' }),
    ],
    outputs: [output.object('result', 'SendGrid response')],
    credentials: ['api_key'],
  },
  async (nodeInput, context) => {
    const config = SendgridSchema.parse(nodeInput.config);
    context.logger.info(`SendGrid: ${config.operation}`);
    return { data: { result: {}, __needsExecution: true } };
  }
);
