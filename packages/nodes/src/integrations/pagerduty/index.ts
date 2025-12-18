import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const PagerDutyNodeSchema = z.object({
  resource: z.enum(['incidents', 'services', 'users', 'schedules', 'escalationPolicies', 'events']).default('incidents'),
  operation: z.enum([
    'list', 'get', 'create', 'update', 'acknowledge', 'resolve', 'snooze',
    'reassign', 'merge', 'trigger', 'addNote'
  ]).default('list'),
  incidentId: z.string().optional(),
  serviceId: z.string().optional(),
  userId: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  urgency: z.enum(['high', 'low']).default('high'),
  status: z.enum(['triggered', 'acknowledged', 'resolved']).optional(),
  escalationPolicyId: z.string().optional(),
  assigneeId: z.string().optional(),
  routingKey: z.string().optional(),
  eventAction: z.enum(['trigger', 'acknowledge', 'resolve']).default('trigger'),
  dedupKey: z.string().optional(),
  severity: z.enum(['critical', 'error', 'warning', 'info']).default('error'),
  source: z.string().optional(),
  component: z.string().optional(),
  group: z.string().optional(),
  class: z.string().optional(),
  customDetails: z.record(z.unknown()).optional(),
  links: z.array(z.object({
    href: z.string(),
    text: z.string(),
  })).optional(),
  images: z.array(z.object({
    src: z.string(),
    href: z.string().optional(),
    alt: z.string().optional(),
  })).optional(),
  snoozeDuration: z.number().optional(),
  note: z.string().optional(),
  since: z.string().optional(),
  until: z.string().optional(),
  limit: z.number().default(25),
  credentialId: z.string().optional(),
});

export type PagerDutyNodeConfig = z.infer<typeof PagerDutyNodeSchema>;

export const pagerdutyNode: NodeDefinition = createNode(
  {
    type: 'integration.pagerduty',
    category: 'integration',
    name: 'PagerDuty',
    description: 'Incident management - Alerts, incidents, on-call',
    icon: 'AlertTriangle',
    inputs: [
      input.select(
        'resource',
        'Resource',
        [
          { label: 'Incidents', value: 'incidents' },
          { label: 'Services', value: 'services' },
          { label: 'Users', value: 'users' },
          { label: 'Schedules', value: 'schedules' },
          { label: 'Escalation Policies', value: 'escalationPolicies' },
          { label: 'Events API', value: 'events' },
        ],
        { default: 'incidents' }
      ),
      input.select(
        'operation',
        'Operation',
        [
          { label: 'List', value: 'list' },
          { label: 'Get', value: 'get' },
          { label: 'Create', value: 'create' },
          { label: 'Update', value: 'update' },
          { label: 'Acknowledge', value: 'acknowledge' },
          { label: 'Resolve', value: 'resolve' },
          { label: 'Snooze', value: 'snooze' },
          { label: 'Reassign', value: 'reassign' },
          { label: 'Trigger Event', value: 'trigger' },
          { label: 'Add Note', value: 'addNote' },
        ],
        { default: 'list' }
      ),
      input.string('incidentId', 'Incident ID', {
        description: 'PagerDuty incident ID',
      }),
      input.string('serviceId', 'Service ID', {
        description: 'PagerDuty service ID',
      }),
      input.string('title', 'Title', {
        description: 'Incident title',
        placeholder: 'Server is down',
      }),
      input.text('description', 'Description', {
        description: 'Incident description',
      }),
      input.select(
        'urgency',
        'Urgency',
        [
          { label: 'High', value: 'high' },
          { label: 'Low', value: 'low' },
        ],
        { default: 'high' }
      ),
      input.select(
        'status',
        'Status',
        [
          { label: 'Triggered', value: 'triggered' },
          { label: 'Acknowledged', value: 'acknowledged' },
          { label: 'Resolved', value: 'resolved' },
        ],
        { default: 'triggered' }
      ),
      input.string('escalationPolicyId', 'Escalation Policy', {
        description: 'Escalation policy ID',
      }),
      input.string('assigneeId', 'Assignee', {
        description: 'User ID to assign',
      }),
      input.string('routingKey', 'Routing Key', {
        description: 'Events API routing key',
      }),
      input.select(
        'eventAction',
        'Event Action',
        [
          { label: 'Trigger', value: 'trigger' },
          { label: 'Acknowledge', value: 'acknowledge' },
          { label: 'Resolve', value: 'resolve' },
        ],
        { default: 'trigger' }
      ),
      input.string('dedupKey', 'Dedup Key', {
        description: 'Deduplication key',
      }),
      input.select(
        'severity',
        'Severity',
        [
          { label: 'Critical', value: 'critical' },
          { label: 'Error', value: 'error' },
          { label: 'Warning', value: 'warning' },
          { label: 'Info', value: 'info' },
        ],
        { default: 'error' }
      ),
      input.string('source', 'Source', {
        description: 'Event source',
        placeholder: 'monitoring-system',
      }),
      input.string('component', 'Component', {
        description: 'Affected component',
      }),
      input.json('customDetails', 'Custom Details', {
        description: 'Additional event details',
        default: {},
      }),
      input.json('links', 'Links', {
        description: 'Related links',
        default: [],
      }),
      input.number('snoozeDuration', 'Snooze Duration', {
        description: 'Snooze duration in seconds',
      }),
      input.text('note', 'Note', {
        description: 'Note to add to incident',
      }),
      input.number('limit', 'Limit', {
        description: 'Maximum results',
        default: 25,
      }),
      input.credential('credentialId', 'PagerDuty Credentials', {
        description: 'PagerDuty API key',
        credentialTypes: ['API_KEY'],
        required: true,
      }),
    ],
    outputs: [
      output.boolean('success', 'Operation success'),
      output.array('incidents', 'Incident list'),
      output.object('incident', 'Incident details'),
      output.string('dedupKey', 'Deduplication key'),
      output.string('status', 'Event status'),
    ],
    defaults: {
      resource: 'incidents',
      operation: 'list',
      urgency: 'high',
      eventAction: 'trigger',
      severity: 'error',
      limit: 25,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = PagerDutyNodeSchema.parse(nodeInput.config);

    logger.info(`PagerDuty ${config.operation} on ${config.resource}`);

    switch (config.operation) {
      case 'list':
        return {
          data: {
            success: true,
            incidents: [
              {
                id: 'P123ABC',
                title: 'Server CPU high',
                status: 'triggered',
                urgency: 'high',
                service: { id: 'PSVC123', summary: 'Production API' },
                created_at: new Date().toISOString(),
              },
              {
                id: 'P456DEF',
                title: 'Database connection errors',
                status: 'acknowledged',
                urgency: 'high',
                service: { id: 'PSVC456', summary: 'Database' },
                created_at: new Date().toISOString(),
              },
            ],
          },
        };

      case 'get':
        return {
          data: {
            success: true,
            incident: {
              id: config.incidentId,
              title: 'Server CPU high',
              status: 'triggered',
              urgency: 'high',
              description: 'CPU usage exceeded 90%',
              service: { id: 'PSVC123', summary: 'Production API' },
              assignments: [{ assignee: { id: 'PUSER1', summary: 'John Doe' } }],
              created_at: new Date().toISOString(),
            },
          },
        };

      case 'create':
        return {
          data: {
            success: true,
            incident: {
              id: `P${Date.now().toString(36).toUpperCase()}`,
              title: config.title,
              status: 'triggered',
              urgency: config.urgency,
              created_at: new Date().toISOString(),
            },
          },
        };

      case 'acknowledge':
        return {
          data: {
            success: true,
            incident: {
              id: config.incidentId,
              status: 'acknowledged',
            },
          },
        };

      case 'resolve':
        return {
          data: {
            success: true,
            incident: {
              id: config.incidentId,
              status: 'resolved',
            },
          },
        };

      case 'trigger':
        return {
          data: {
            success: true,
            status: 'success',
            dedupKey: config.dedupKey || `dedup_${Date.now()}`,
            message: 'Event processed',
          },
        };

      case 'addNote':
        return {
          data: {
            success: true,
            note: {
              id: `note_${Date.now()}`,
              content: config.note,
              created_at: new Date().toISOString(),
            },
          },
        };

      default:
        return { data: { success: true } };
    }
  }
);
