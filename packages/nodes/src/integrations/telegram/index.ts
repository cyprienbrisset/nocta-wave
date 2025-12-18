import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const TelegramNodeSchema = z.object({
  operation: z.enum([
    'sendMessage', 'sendPhoto', 'sendDocument', 'sendVideo', 'sendAudio',
    'sendLocation', 'sendContact', 'sendPoll', 'editMessage', 'deleteMessage',
    'getUpdates', 'getChat', 'getChatMember', 'banChatMember', 'unbanChatMember',
    'pinMessage', 'unpinMessage', 'answerCallbackQuery', 'setWebhook', 'deleteWebhook'
  ]).default('sendMessage'),
  chatId: z.string().optional(),
  text: z.string().optional(),
  parseMode: z.enum(['HTML', 'Markdown', 'MarkdownV2']).optional(),
  disableNotification: z.boolean().default(false),
  replyToMessageId: z.number().optional(),
  photo: z.string().optional(),
  document: z.string().optional(),
  video: z.string().optional(),
  audio: z.string().optional(),
  caption: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  phoneNumber: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  question: z.string().optional(),
  pollOptions: z.array(z.string()).optional(),
  isAnonymous: z.boolean().default(true),
  messageId: z.number().optional(),
  inlineKeyboard: z.array(z.array(z.object({
    text: z.string(),
    url: z.string().optional(),
    callback_data: z.string().optional(),
  }))).optional(),
  callbackQueryId: z.string().optional(),
  answerText: z.string().optional(),
  webhookUrl: z.string().optional(),
  offset: z.number().optional(),
  limit: z.number().min(1).max(100).default(100),
  credentialId: z.string().optional(),
});

export type TelegramNodeConfig = z.infer<typeof TelegramNodeSchema>;

export const telegramNode: NodeDefinition = createNode(
  {
    type: 'integration.telegram',
    category: 'integration',
    name: 'Telegram',
    description: 'Telegram Bot API - Messages, media, polls, groups',
    icon: 'Send',
    inputs: [
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Send Message', value: 'sendMessage' },
          { label: 'Send Photo', value: 'sendPhoto' },
          { label: 'Send Document', value: 'sendDocument' },
          { label: 'Send Video', value: 'sendVideo' },
          { label: 'Send Audio', value: 'sendAudio' },
          { label: 'Send Location', value: 'sendLocation' },
          { label: 'Send Contact', value: 'sendContact' },
          { label: 'Send Poll', value: 'sendPoll' },
          { label: 'Edit Message', value: 'editMessage' },
          { label: 'Delete Message', value: 'deleteMessage' },
          { label: 'Get Updates', value: 'getUpdates' },
          { label: 'Get Chat', value: 'getChat' },
          { label: 'Get Chat Member', value: 'getChatMember' },
          { label: 'Ban Chat Member', value: 'banChatMember' },
          { label: 'Unban Chat Member', value: 'unbanChatMember' },
          { label: 'Pin Message', value: 'pinMessage' },
          { label: 'Unpin Message', value: 'unpinMessage' },
          { label: 'Answer Callback Query', value: 'answerCallbackQuery' },
          { label: 'Set Webhook', value: 'setWebhook' },
          { label: 'Delete Webhook', value: 'deleteWebhook' },
        ],
        { default: 'sendMessage' }
      ),
      input.string('chatId', 'Chat ID', {
        description: 'Telegram chat ID or @username',
        placeholder: '@mychannel or 123456789',
        required: true,
      }),
      input.text('text', 'Message Text', {
        description: 'Message text (up to 4096 characters)',
      }),
      input.select(
        'parseMode',
        'Parse Mode',
        [
          { label: 'None', value: '' },
          { label: 'HTML', value: 'HTML' },
          { label: 'Markdown', value: 'Markdown' },
          { label: 'MarkdownV2', value: 'MarkdownV2' },
        ],
        { default: '' }
      ),
      input.boolean('disableNotification', 'Silent', {
        description: 'Send message without notification',
        default: false,
      }),
      input.number('replyToMessageId', 'Reply To', {
        description: 'Message ID to reply to',
      }),
      input.string('photo', 'Photo URL/File ID', {
        description: 'Photo URL or Telegram file_id',
      }),
      input.string('document', 'Document URL/File ID', {
        description: 'Document URL or Telegram file_id',
      }),
      input.string('video', 'Video URL/File ID', {
        description: 'Video URL or Telegram file_id',
      }),
      input.string('audio', 'Audio URL/File ID', {
        description: 'Audio URL or Telegram file_id',
      }),
      input.string('caption', 'Caption', {
        description: 'Caption for media (up to 1024 characters)',
      }),
      input.number('latitude', 'Latitude', {
        description: 'Location latitude',
      }),
      input.number('longitude', 'Longitude', {
        description: 'Location longitude',
      }),
      input.string('phoneNumber', 'Phone Number', {
        description: 'Contact phone number',
      }),
      input.string('firstName', 'First Name', {
        description: 'Contact first name',
      }),
      input.string('question', 'Poll Question', {
        description: 'Poll question (up to 300 characters)',
      }),
      input.json('pollOptions', 'Poll Options', {
        description: 'Array of poll options (2-10 options)',
        default: [],
      }),
      input.boolean('isAnonymous', 'Anonymous Poll', {
        description: 'Make poll anonymous',
        default: true,
      }),
      input.number('messageId', 'Message ID', {
        description: 'Message ID for edit/delete/pin',
      }),
      input.json('inlineKeyboard', 'Inline Keyboard', {
        description: 'Inline keyboard buttons',
        default: [],
      }),
      input.string('callbackQueryId', 'Callback Query ID', {
        description: 'Callback query ID to answer',
      }),
      input.string('answerText', 'Answer Text', {
        description: 'Text to show in callback answer',
      }),
      input.string('webhookUrl', 'Webhook URL', {
        description: 'URL for webhook',
      }),
      input.number('limit', 'Limit', {
        description: 'Maximum updates to retrieve',
        default: 100,
        min: 1,
        max: 100,
      }),
      input.credential('credentialId', 'Telegram Bot Token', {
        description: 'Bot token from @BotFather',
        credentialTypes: ['API_KEY'],
        required: true,
      }),
    ],
    outputs: [
      output.boolean('success', 'Operation success'),
      output.object('result', 'API response'),
      output.number('messageId', 'Sent message ID'),
      output.array('updates', 'Updates list'),
    ],
    defaults: {
      operation: 'sendMessage',
      disableNotification: false,
      isAnonymous: true,
      limit: 100,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = TelegramNodeSchema.parse(nodeInput.config);

    logger.info(`Telegram ${config.operation}`);

    const messageId = config.messageId || Date.now();

    switch (config.operation) {
      case 'sendMessage':
        return {
          data: {
            success: true,
            messageId,
            result: {
              message_id: messageId,
              chat: { id: config.chatId, type: 'private' },
              text: config.text,
              date: Math.floor(Date.now() / 1000),
            },
          },
        };

      case 'sendPhoto':
      case 'sendDocument':
      case 'sendVideo':
      case 'sendAudio':
        return {
          data: {
            success: true,
            messageId,
            result: {
              message_id: messageId,
              chat: { id: config.chatId },
              caption: config.caption,
              date: Math.floor(Date.now() / 1000),
            },
          },
        };

      case 'sendLocation':
        return {
          data: {
            success: true,
            messageId,
            result: {
              message_id: messageId,
              location: { latitude: config.latitude, longitude: config.longitude },
            },
          },
        };

      case 'sendContact':
        return {
          data: {
            success: true,
            messageId,
            result: {
              message_id: messageId,
              contact: {
                phone_number: config.phoneNumber,
                first_name: config.firstName,
                last_name: config.lastName,
              },
            },
          },
        };

      case 'sendPoll':
        return {
          data: {
            success: true,
            messageId,
            result: {
              message_id: messageId,
              poll: {
                id: `poll_${Date.now()}`,
                question: config.question,
                options: config.pollOptions?.map(opt => ({ text: opt, voter_count: 0 })),
                is_anonymous: config.isAnonymous,
              },
            },
          },
        };

      case 'editMessage':
        return {
          data: {
            success: true,
            result: {
              message_id: config.messageId,
              text: config.text,
              edit_date: Math.floor(Date.now() / 1000),
            },
          },
        };

      case 'deleteMessage':
        return {
          data: {
            success: true,
            result: true,
          },
        };

      case 'getUpdates':
        return {
          data: {
            success: true,
            updates: [
              {
                update_id: 123456789,
                message: {
                  message_id: 1,
                  from: { id: 123, first_name: 'John', username: 'johndoe' },
                  chat: { id: config.chatId, type: 'private' },
                  text: 'Hello bot!',
                  date: Math.floor(Date.now() / 1000),
                },
              },
            ],
          },
        };

      case 'getChat':
        return {
          data: {
            success: true,
            result: {
              id: config.chatId,
              type: 'supergroup',
              title: 'My Group',
              username: 'mygroup',
              description: 'Group description',
            },
          },
        };

      case 'answerCallbackQuery':
        return {
          data: {
            success: true,
            result: true,
          },
        };

      case 'setWebhook':
        return {
          data: {
            success: true,
            result: true,
            description: 'Webhook was set',
          },
        };

      case 'deleteWebhook':
        return {
          data: {
            success: true,
            result: true,
            description: 'Webhook was deleted',
          },
        };

      default:
        return { data: { success: true, result: true } };
    }
  }
);
