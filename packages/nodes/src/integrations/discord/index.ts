import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const DiscordSchema = z.object({
  operation: z.enum(['sendMessage', 'sendEmbed', 'createChannel', 'deleteMessage']).default('sendMessage'),
  webhookUrl: z.string().optional(),
  channelId: z.string().optional(),
  content: z.string().optional(),
  username: z.string().optional(),
  avatarUrl: z.string().optional(),
  embed: z.record(z.unknown()).optional(),
});

export const discordNode: NodeDefinition = createNode(
  {
    type: 'integration.discord',
    category: 'integration',
    name: 'Discord',
    description: 'Send messages to Discord channels',
    icon: 'MessageCircle',
    inputs: [
      input.select('operation', 'Operation', [
        { label: 'Send Message', value: 'sendMessage' },
        { label: 'Send Embed', value: 'sendEmbed' },
      ], { default: 'sendMessage' }),
      input.string('webhookUrl', 'Webhook URL', { description: 'Discord webhook URL' }),
      input.string('content', 'Message', { description: 'Message content' }),
      input.string('username', 'Username', { description: 'Override webhook username' }),
      input.string('avatarUrl', 'Avatar URL', { description: 'Override avatar' }),
      input.json('embed', 'Embed', { description: 'Discord embed object' }),
    ],
    outputs: [output.main({ description: 'Operation result' })],
    credentials: ['api_key'],
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = DiscordSchema.parse(nodeInput.config);

    logger.info(`Discord: ${config.operation}`);

    if (!config.webhookUrl) {
      throw new Error('Webhook URL is required');
    }

    const body: Record<string, unknown> = {
      content: config.content,
      username: config.username,
      avatar_url: config.avatarUrl,
    };

    if (config.operation === 'sendEmbed' && config.embed) {
      body.embeds = [config.embed];
    }

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Discord error: ${response.statusText}`);
    }

    return { data: { success: true, status: response.status } };
  }
);
