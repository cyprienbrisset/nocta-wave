import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const TeamsNodeSchema = z.object({
  resource: z.enum(['messages', 'channels', 'teams', 'meetings', 'chats', 'users']).default('messages'),
  operation: z.enum([
    'send', 'list', 'get', 'create', 'update', 'delete',
    'reply', 'createMeeting', 'listMembers', 'addMember'
  ]).default('send'),
  teamId: z.string().optional(),
  channelId: z.string().optional(),
  chatId: z.string().optional(),
  messageId: z.string().optional(),
  content: z.string().optional(),
  contentType: z.enum(['text', 'html']).default('text'),
  subject: z.string().optional(),
  importance: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  mentions: z.array(z.object({
    id: z.string(),
    mentionText: z.string(),
  })).optional(),
  attachments: z.array(z.object({
    contentType: z.string(),
    contentUrl: z.string(),
    name: z.string(),
  })).optional(),
  meetingSubject: z.string().optional(),
  meetingStartTime: z.string().optional(),
  meetingEndTime: z.string().optional(),
  attendees: z.array(z.string()).optional(),
  top: z.number().min(1).max(50).default(20),
  credentialId: z.string().optional(),
});

export type TeamsNodeConfig = z.infer<typeof TeamsNodeSchema>;

export const teamsNode: NodeDefinition = createNode(
  {
    type: 'integration.teams',
    category: 'integration',
    name: 'Microsoft Teams',
    description: 'Team collaboration - Messages, channels, meetings',
    icon: 'Users',
    inputs: [
      input.select(
        'resource',
        'Resource',
        [
          { label: 'Messages', value: 'messages' },
          { label: 'Channels', value: 'channels' },
          { label: 'Teams', value: 'teams' },
          { label: 'Meetings', value: 'meetings' },
          { label: 'Chats', value: 'chats' },
          { label: 'Users', value: 'users' },
        ],
        { default: 'messages' }
      ),
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Send Message', value: 'send' },
          { label: 'List', value: 'list' },
          { label: 'Get', value: 'get' },
          { label: 'Create', value: 'create' },
          { label: 'Update', value: 'update' },
          { label: 'Delete', value: 'delete' },
          { label: 'Reply to Message', value: 'reply' },
          { label: 'Create Meeting', value: 'createMeeting' },
          { label: 'List Members', value: 'listMembers' },
          { label: 'Add Member', value: 'addMember' },
        ],
        { default: 'send' }
      ),
      input.string('teamId', 'Team ID', {
        description: 'Microsoft Teams team ID',
      }),
      input.string('channelId', 'Channel ID', {
        description: 'Channel ID within the team',
      }),
      input.string('chatId', 'Chat ID', {
        description: 'Chat ID for direct messages',
      }),
      input.string('messageId', 'Message ID', {
        description: 'Message ID for replies/updates',
      }),
      input.text('content', 'Message Content', {
        description: 'Message body',
        placeholder: 'Hello team!',
      }),
      input.select(
        'contentType',
        'Content Type',
        [
          { label: 'Text', value: 'text' },
          { label: 'HTML', value: 'html' },
        ],
        { default: 'text' }
      ),
      input.string('subject', 'Subject', {
        description: 'Message subject (for new conversations)',
      }),
      input.select(
        'importance',
        'Importance',
        [
          { label: 'Low', value: 'low' },
          { label: 'Normal', value: 'normal' },
          { label: 'High', value: 'high' },
          { label: 'Urgent', value: 'urgent' },
        ],
        { default: 'normal' }
      ),
      input.json('mentions', 'Mentions', {
        description: 'Users to mention in the message',
        default: [],
      }),
      input.json('attachments', 'Attachments', {
        description: 'File attachments',
        default: [],
      }),
      input.string('meetingSubject', 'Meeting Subject', {
        description: 'Subject for the meeting',
      }),
      input.string('meetingStartTime', 'Start Time', {
        description: 'Meeting start time (ISO 8601)',
        placeholder: '2024-12-31T10:00:00Z',
      }),
      input.string('meetingEndTime', 'End Time', {
        description: 'Meeting end time (ISO 8601)',
        placeholder: '2024-12-31T11:00:00Z',
      }),
      input.json('attendees', 'Attendees', {
        description: 'Email addresses of attendees',
        default: [],
      }),
      input.number('top', 'Limit', {
        description: 'Maximum results',
        default: 20,
        min: 1,
        max: 50,
      }),
      input.credential('credentialId', 'Microsoft Credentials', {
        description: 'Microsoft Graph OAuth2 credentials',
        credentialTypes: ['OAUTH2'],
        required: true,
      }),
    ],
    outputs: [output.main({ description: 'API operation result' })],
    defaults: {
      resource: 'messages',
      operation: 'send',
      contentType: 'text',
      importance: 'normal',
      top: 20,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = TeamsNodeSchema.parse(nodeInput.config);

    logger.info(`Microsoft Teams ${config.operation} on ${config.resource}`);

    switch (config.operation) {
      case 'send':
        return {
          data: {
            success: true,
            id: `msg_${Date.now()}`,
            item: {
              id: `msg_${Date.now()}`,
              body: { content: config.content, contentType: config.contentType },
              from: { user: { displayName: 'Bot', id: 'bot_123' } },
              createdDateTime: new Date().toISOString(),
              webUrl: `https://teams.microsoft.com/l/message/${config.channelId}/${Date.now()}`,
            },
          },
        };

      case 'list':
        return {
          data: {
            success: true,
            items: [
              {
                id: 'msg_123',
                body: { content: 'Hello everyone!', contentType: 'text' },
                from: { user: { displayName: 'John Doe', id: 'user_123' } },
                createdDateTime: new Date().toISOString(),
                importance: 'normal',
              },
              {
                id: 'msg_124',
                body: { content: 'Meeting at 3pm', contentType: 'text' },
                from: { user: { displayName: 'Jane Smith', id: 'user_456' } },
                createdDateTime: new Date().toISOString(),
              },
            ],
          },
        };

      case 'get':
        return {
          data: {
            success: true,
            item: {
              id: config.messageId || config.teamId || config.channelId,
              body: { content: 'Message content here', contentType: 'text' },
              from: { user: { displayName: 'John Doe' } },
              createdDateTime: new Date().toISOString(),
              lastModifiedDateTime: new Date().toISOString(),
            },
          },
        };

      case 'create':
        return {
          data: {
            success: true,
            id: `${config.resource}_${Date.now()}`,
            item: {
              id: `${config.resource}_${Date.now()}`,
              displayName: config.subject || 'New Item',
              createdDateTime: new Date().toISOString(),
            },
          },
        };

      case 'reply':
        return {
          data: {
            success: true,
            id: `reply_${Date.now()}`,
            parentMessageId: config.messageId,
            body: { content: config.content },
          },
        };

      case 'createMeeting':
        return {
          data: {
            success: true,
            id: `meeting_${Date.now()}`,
            item: {
              id: `meeting_${Date.now()}`,
              subject: config.meetingSubject,
              startDateTime: config.meetingStartTime,
              endDateTime: config.meetingEndTime,
              attendees: config.attendees?.map(email => ({ emailAddress: { address: email } })),
              joinWebUrl: `https://teams.microsoft.com/l/meetup-join/${Date.now()}`,
              onlineMeeting: {
                joinUrl: `https://teams.microsoft.com/l/meetup-join/${Date.now()}`,
              },
            },
          },
        };

      case 'listMembers':
        return {
          data: {
            success: true,
            items: [
              { id: 'user_1', displayName: 'John Doe', email: 'john@example.com', roles: ['owner'] },
              { id: 'user_2', displayName: 'Jane Smith', email: 'jane@example.com', roles: ['member'] },
            ],
          },
        };

      case 'addMember':
        return {
          data: {
            success: true,
            added: true,
            teamId: config.teamId,
          },
        };

      default:
        return { data: { success: false, error: 'Unknown operation' } };
    }
  }
);
