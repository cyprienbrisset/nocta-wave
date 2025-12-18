import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const SlackSchema = z.object({
  operation: z.enum(['sendMessage', 'updateMessage', 'uploadFile', 'getUser', 'listChannels']).default('sendMessage'),
  channel: z.string().optional(),
  text: z.string().optional(),
  blocks: z.array(z.record(z.unknown())).optional(),
  threadTs: z.string().optional(),
  messageTs: z.string().optional(),
  userId: z.string().optional(),
});

export const slackNode: NodeDefinition = createNode(
  {
    type: 'integration.slack',
    category: 'integration',
    name: 'Slack',
    description: 'Send messages and interact with Slack',
    icon: 'MessageSquare',
    inputs: [
      input.select('operation', 'Operation', [
        { label: 'Send Message', value: 'sendMessage' },
        { label: 'Update Message', value: 'updateMessage' },
        { label: 'Upload File', value: 'uploadFile' },
        { label: 'Get User', value: 'getUser' },
        { label: 'List Channels', value: 'listChannels' },
      ], { default: 'sendMessage' }),
      input.string('channel', 'Channel', { description: 'Channel ID or name (#channel)' }),
      input.string('text', 'Message', { description: 'Message text' }),
      input.json('blocks', 'Blocks', { description: 'Slack Block Kit blocks' }),
      input.string('threadTs', 'Thread TS', { description: 'Thread timestamp for replies' }),
      input.string('messageTs', 'Message TS', { description: 'Message timestamp (for updates)' }),
      input.string('userId', 'User ID', { description: 'Slack user ID' }),
    ],
    outputs: [output.object('response', 'Slack API response')],
    credentials: ['oauth2', 'api_key'],
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = SlackSchema.parse(nodeInput.config);
    const credentials = nodeInput.credentials;

    logger.info(`Slack: ${config.operation}`);

    if (!credentials?.accessToken && !credentials?.apiKey) {
      throw new Error('Slack credentials are required');
    }

    const token = credentials.accessToken || credentials.apiKey;
    const baseUrl = 'https://slack.com/api';

    let endpoint = '';
    let body: Record<string, unknown> = {};

    switch (config.operation) {
      case 'sendMessage':
        endpoint = '/chat.postMessage';
        body = {
          channel: config.channel,
          text: config.text,
          blocks: config.blocks,
          thread_ts: config.threadTs,
        };
        break;
      case 'updateMessage':
        endpoint = '/chat.update';
        body = {
          channel: config.channel,
          ts: config.messageTs,
          text: config.text,
          blocks: config.blocks,
        };
        break;
      case 'getUser':
        endpoint = '/users.info';
        body = { user: config.userId };
        break;
      case 'listChannels':
        endpoint = '/conversations.list';
        break;
      default:
        throw new Error(`Unknown operation: ${config.operation}`);
    }

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const result = await response.json() as { ok: boolean; error?: string };

    if (!result.ok) {
      logger.error('Slack API error', { error: result.error });
      throw new Error(`Slack API error: ${result.error}`);
    }

    return { data: result as Record<string, unknown> };
  }
);
