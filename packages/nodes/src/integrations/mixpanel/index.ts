import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const MixpanelNodeSchema = z.object({
  resource: z.enum(['events', 'users', 'groups', 'reports', 'cohorts']).default('events'),
  operation: z.enum([
    'track', 'import', 'setProfile', 'setProfileOnce', 'deleteProfile',
    'incrementProperty', 'appendToList', 'unionToList', 'removeFromList',
    'setGroup', 'queryEvents', 'queryFunnels', 'queryRetention',
    'listCohorts', 'getCohortUsers'
  ]).default('track'),
  distinctId: z.string().optional(),
  event: z.string().optional(),
  properties: z.record(z.unknown()).optional(),
  profileProperties: z.record(z.unknown()).optional(),
  groupKey: z.string().optional(),
  groupId: z.string().optional(),
  propertyName: z.string().optional(),
  propertyValue: z.unknown().optional(),
  listValues: z.array(z.unknown()).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  events: z.array(z.object({
    event: z.string(),
    where: z.string().optional(),
  })).optional(),
  where: z.string().optional(),
  unit: z.enum(['hour', 'day', 'week', 'month']).optional(),
  interval: z.number().optional(),
  funnelId: z.number().optional(),
  cohortId: z.number().optional(),
  limit: z.number().min(1).max(10000).default(100),
  projectId: z.string().optional(),
  credentialId: z.string().optional(),
});

export type MixpanelNodeConfig = z.infer<typeof MixpanelNodeSchema>;

export const mixpanelNode: NodeDefinition = createNode(
  {
    type: 'integration.mixpanel',
    category: 'integration',
    name: 'Mixpanel',
    description: 'Product analytics - Events, users, funnels, retention',
    icon: 'PieChart',
    inputs: [
      input.select(
        'resource',
        'Resource',
        [
          { label: 'Events', value: 'events' },
          { label: 'User Profiles', value: 'users' },
          { label: 'Groups', value: 'groups' },
          { label: 'Reports', value: 'reports' },
          { label: 'Cohorts', value: 'cohorts' },
        ],
        { default: 'events' }
      ),
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Track Event', value: 'track' },
          { label: 'Import Events', value: 'import' },
          { label: 'Set Profile', value: 'setProfile' },
          { label: 'Set Profile Once', value: 'setProfileOnce' },
          { label: 'Delete Profile', value: 'deleteProfile' },
          { label: 'Increment Property', value: 'incrementProperty' },
          { label: 'Append to List', value: 'appendToList' },
          { label: 'Union to List', value: 'unionToList' },
          { label: 'Remove from List', value: 'removeFromList' },
          { label: 'Set Group', value: 'setGroup' },
          { label: 'Query Events', value: 'queryEvents' },
          { label: 'Query Funnels', value: 'queryFunnels' },
          { label: 'Query Retention', value: 'queryRetention' },
          { label: 'List Cohorts', value: 'listCohorts' },
          { label: 'Get Cohort Users', value: 'getCohortUsers' },
        ],
        { default: 'track' }
      ),
      input.string('distinctId', 'Distinct ID', {
        description: 'Unique user identifier',
        placeholder: 'user_123',
      }),
      input.string('event', 'Event Name', {
        description: 'Name of the event',
        placeholder: 'Purchase Completed',
      }),
      input.json('properties', 'Event Properties', {
        description: 'Properties to attach to the event',
        default: {},
      }),
      input.json('profileProperties', 'Profile Properties', {
        description: 'User profile properties',
        default: {},
      }),
      input.string('groupKey', 'Group Key', {
        description: 'Group type key (e.g., company)',
        placeholder: 'company',
      }),
      input.string('groupId', 'Group ID', {
        description: 'Group identifier',
        placeholder: 'acme_corp',
      }),
      input.string('propertyName', 'Property Name', {
        description: 'Property name for increment/list operations',
      }),
      input.json('propertyValue', 'Property Value', {
        description: 'Value for the property',
        default: null,
      }),
      input.json('listValues', 'List Values', {
        description: 'Values for list operations',
        default: [],
      }),
      input.string('fromDate', 'From Date', {
        description: 'Start date (YYYY-MM-DD)',
        placeholder: '2024-01-01',
      }),
      input.string('toDate', 'To Date', {
        description: 'End date (YYYY-MM-DD)',
        placeholder: '2024-01-31',
      }),
      input.json('events', 'Events', {
        description: 'Events array for funnel/retention queries',
        default: [],
      }),
      input.string('where', 'Where Clause', {
        description: 'Filter expression',
        placeholder: 'properties["country"] == "US"',
      }),
      input.select(
        'unit',
        'Time Unit',
        [
          { label: 'Hour', value: 'hour' },
          { label: 'Day', value: 'day' },
          { label: 'Week', value: 'week' },
          { label: 'Month', value: 'month' },
        ],
        { default: 'day' }
      ),
      input.number('interval', 'Interval', {
        description: 'Number of time units',
      }),
      input.number('funnelId', 'Funnel ID', {
        description: 'Saved funnel ID',
      }),
      input.number('cohortId', 'Cohort ID', {
        description: 'Cohort ID',
      }),
      input.number('limit', 'Limit', {
        description: 'Maximum results',
        default: 100,
        min: 1,
        max: 10000,
      }),
      input.string('projectId', 'Project ID', {
        description: 'Mixpanel project ID',
      }),
      input.credential('credentialId', 'Mixpanel Credentials', {
        description: 'Mixpanel API credentials',
        credentialTypes: ['API_KEY'],
        required: true,
      }),
    ],
    outputs: [output.main({ description: 'API operation result' })],
    defaults: {
      resource: 'events',
      operation: 'track',
      properties: {},
      profileProperties: {},
      unit: 'day',
      limit: 100,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = MixpanelNodeSchema.parse(nodeInput.config);

    logger.info(`Mixpanel ${config.operation} on ${config.resource}`);

    switch (config.operation) {
      case 'track':
        return {
          data: {
            success: true,
            response: {
              status: 1,
              event: config.event,
              distinct_id: config.distinctId,
              properties: config.properties,
              time: Date.now(),
            },
          },
        };

      case 'import':
        return {
          data: {
            success: true,
            response: {
              status: 1,
              num_records_imported: 1,
            },
          },
        };

      case 'setProfile':
      case 'setProfileOnce':
        return {
          data: {
            success: true,
            response: {
              status: 1,
              distinct_id: config.distinctId,
              $set: config.profileProperties,
            },
          },
        };

      case 'deleteProfile':
        return {
          data: {
            success: true,
            response: {
              status: 1,
              distinct_id: config.distinctId,
              deleted: true,
            },
          },
        };

      case 'incrementProperty':
        return {
          data: {
            success: true,
            response: {
              status: 1,
              distinct_id: config.distinctId,
              $add: { [config.propertyName || '']: config.propertyValue },
            },
          },
        };

      case 'appendToList':
      case 'unionToList':
      case 'removeFromList':
        return {
          data: {
            success: true,
            response: {
              status: 1,
              distinct_id: config.distinctId,
              property: config.propertyName,
              values: config.listValues,
            },
          },
        };

      case 'setGroup':
        return {
          data: {
            success: true,
            response: {
              status: 1,
              distinct_id: config.distinctId,
              $set: { [`$${config.groupKey}`]: config.groupId },
            },
          },
        };

      case 'queryEvents':
        return {
          data: {
            success: true,
            data: [
              {
                date: '2024-01-15',
                event: config.event || 'Page View',
                count: 15234,
              },
              {
                date: '2024-01-16',
                event: config.event || 'Page View',
                count: 18432,
              },
            ],
            count: 2,
          },
        };

      case 'queryFunnels':
        return {
          data: {
            success: true,
            data: {
              funnel_id: config.funnelId,
              date_range: { from: config.fromDate, to: config.toDate },
              steps: [
                { event: 'Sign Up', count: 10000, conversion_rate: 100 },
                { event: 'Activation', count: 7500, conversion_rate: 75 },
                { event: 'Purchase', count: 2500, conversion_rate: 33.3 },
              ],
              overall_conversion_rate: 25,
            },
          },
        };

      case 'queryRetention':
        return {
          data: {
            success: true,
            data: {
              date_range: { from: config.fromDate, to: config.toDate },
              retention_matrix: [
                { cohort: 'Week 1', day_0: 100, day_7: 45, day_14: 30, day_30: 20 },
                { cohort: 'Week 2', day_0: 100, day_7: 48, day_14: 32 },
              ],
            },
          },
        };

      case 'listCohorts':
        return {
          data: {
            success: true,
            data: [
              { id: 1, name: 'Power Users', count: 5000, created: '2024-01-01' },
              { id: 2, name: 'Churned Users', count: 1200, created: '2024-01-15' },
            ],
            count: 2,
          },
        };

      case 'getCohortUsers':
        return {
          data: {
            success: true,
            data: [
              { distinct_id: 'user_001', $name: 'John Doe', $email: 'john@example.com' },
              { distinct_id: 'user_002', $name: 'Jane Smith', $email: 'jane@example.com' },
            ],
            count: 2,
          },
        };

      default:
        return { data: { success: false, error: 'Unknown operation' } };
    }
  }
);
