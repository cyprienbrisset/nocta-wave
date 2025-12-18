import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const GmailSchema = z.object({
  operation: z.enum(['send', 'reply', 'list', 'get', 'addLabel', 'markRead']).default('send'),
  to: z.string().optional(),
  cc: z.string().optional(),
  bcc: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
  isHtml: z.boolean().default(false),
  messageId: z.string().optional(),
  threadId: z.string().optional(),
  labelIds: z.array(z.string()).optional(),
  maxResults: z.number().default(10),
});

export const gmailNode: NodeDefinition = createNode(
  {
    type: 'integration.gmail',
    category: 'integration',
    name: 'Gmail',
    description: 'Send and manage Gmail emails',
    icon: 'Mail',
    inputs: [
      input.select('operation', 'Operation', [
        { label: 'Send Email', value: 'send' },
        { label: 'Reply to Email', value: 'reply' },
        { label: 'List Emails', value: 'list' },
        { label: 'Get Email', value: 'get' },
        { label: 'Add Label', value: 'addLabel' },
        { label: 'Mark as Read', value: 'markRead' },
      ], { default: 'send' }),
      input.string('to', 'To', { description: 'Recipient email(s), comma-separated' }),
      input.string('cc', 'CC', { description: 'CC recipients' }),
      input.string('bcc', 'BCC', { description: 'BCC recipients' }),
      input.string('subject', 'Subject', { description: 'Email subject' }),
      input.code('body', 'Body', { description: 'Email body' }),
      input.boolean('isHtml', 'HTML Body', { default: false }),
      input.string('messageId', 'Message ID', { description: 'Email message ID' }),
      input.string('threadId', 'Thread ID', { description: 'Email thread ID' }),
      input.number('maxResults', 'Max Results', { default: 10 }),
    ],
    outputs: [output.object('result', 'Gmail API response')],
    credentials: ['oauth2'],
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = GmailSchema.parse(nodeInput.config);
    const credentials = nodeInput.credentials;

    logger.info(`Gmail: ${config.operation}`);

    if (!credentials?.accessToken) {
      throw new Error('Gmail OAuth credentials are required');
    }

    const baseUrl = 'https://gmail.googleapis.com/gmail/v1/users/me';
    const headers = {
      'Authorization': `Bearer ${credentials.accessToken}`,
      'Content-Type': 'application/json',
    };

    let response: Response;

    switch (config.operation) {
      case 'send':
        const rawEmail = createRawEmail(config);
        response = await fetch(`${baseUrl}/messages/send`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ raw: rawEmail }),
        });
        break;
      case 'list':
        response = await fetch(`${baseUrl}/messages?maxResults=${config.maxResults}`, { headers });
        break;
      case 'get':
        response = await fetch(`${baseUrl}/messages/${config.messageId}`, { headers });
        break;
      default:
        throw new Error(`Operation ${config.operation} not fully implemented`);
    }

    const result = await response.json() as Record<string, unknown> & { error?: { message?: string } };
    if (!response.ok) throw new Error(`Gmail API error: ${result.error?.message}`);
    return { data: result };
  }
);

function createRawEmail(config: z.infer<typeof GmailSchema>): string {
  const boundary = 'boundary_' + Date.now();
  const contentType = config.isHtml ? 'text/html' : 'text/plain';

  let email = [
    `To: ${config.to}`,
    config.cc ? `Cc: ${config.cc}` : '',
    config.bcc ? `Bcc: ${config.bcc}` : '',
    `Subject: ${config.subject}`,
    `Content-Type: ${contentType}; charset=utf-8`,
    '',
    config.body,
  ].filter(Boolean).join('\r\n');

  return Buffer.from(email).toString('base64url');
}
