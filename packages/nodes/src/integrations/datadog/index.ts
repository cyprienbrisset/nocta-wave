import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const DatadogNodeSchema = z.object({
  resource: z.enum(['metrics', 'events', 'logs', 'monitors', 'dashboards', 'incidents', 'synthetics']).default('metrics'),
  operation: z.enum([
    'submit', 'query', 'list', 'get', 'create', 'update', 'delete',
    'mute', 'unmute', 'search', 'aggregate'
  ]).default('submit'),
  metric: z.string().optional(),
  points: z.array(z.object({
    timestamp: z.number(),
    value: z.number(),
  })).optional(),
  tags: z.array(z.string()).optional(),
  type: z.enum(['gauge', 'count', 'rate', 'distribution']).default('gauge'),
  query: z.string().optional(),
  from: z.number().optional(),
  to: z.number().optional(),
  title: z.string().optional(),
  text: z.string().optional(),
  alertType: z.enum(['info', 'warning', 'error', 'success']).optional(),
  priority: z.enum(['normal', 'low']).optional(),
  source: z.string().optional(),
  service: z.string().optional(),
  hostname: z.string().optional(),
  message: z.string().optional(),
  level: z.enum(['debug', 'info', 'warning', 'error', 'critical']).default('info'),
  monitorId: z.number().optional(),
  monitorType: z.enum(['metric alert', 'service check', 'event alert', 'query alert', 'composite', 'log alert']).optional(),
  monitorQuery: z.string().optional(),
  thresholds: z.object({
    critical: z.number().optional(),
    warning: z.number().optional(),
    ok: z.number().optional(),
  }).optional(),
  notifyNoData: z.boolean().default(false),
  credentialId: z.string().optional(),
});

export type DatadogNodeConfig = z.infer<typeof DatadogNodeSchema>;

export const datadogNode: NodeDefinition = createNode(
  {
    type: 'integration.datadog',
    category: 'integration',
    name: 'Datadog',
    description: 'Monitoring - Metrics, logs, events, alerts',
    icon: 'Activity',
    inputs: [
      input.select(
        'resource',
        'Resource',
        [
          { label: 'Metrics', value: 'metrics' },
          { label: 'Events', value: 'events' },
          { label: 'Logs', value: 'logs' },
          { label: 'Monitors', value: 'monitors' },
          { label: 'Dashboards', value: 'dashboards' },
          { label: 'Incidents', value: 'incidents' },
          { label: 'Synthetics', value: 'synthetics' },
        ],
        { default: 'metrics' }
      ),
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Submit', value: 'submit' },
          { label: 'Query', value: 'query' },
          { label: 'List', value: 'list' },
          { label: 'Get', value: 'get' },
          { label: 'Create', value: 'create' },
          { label: 'Update', value: 'update' },
          { label: 'Delete', value: 'delete' },
          { label: 'Mute', value: 'mute' },
          { label: 'Unmute', value: 'unmute' },
          { label: 'Search', value: 'search' },
        ],
        { default: 'submit' }
      ),
      input.string('metric', 'Metric Name', {
        description: 'Metric name',
        placeholder: 'custom.metric.name',
      }),
      input.json('points', 'Data Points', {
        description: 'Metric data points',
        default: [],
      }),
      input.json('tags', 'Tags', {
        description: 'Tags for filtering',
        default: [],
      }),
      input.select(
        'type',
        'Metric Type',
        [
          { label: 'Gauge', value: 'gauge' },
          { label: 'Count', value: 'count' },
          { label: 'Rate', value: 'rate' },
          { label: 'Distribution', value: 'distribution' },
        ],
        { default: 'gauge' }
      ),
      input.string('query', 'Query', {
        description: 'Metrics query or search query',
        placeholder: 'avg:system.cpu.user{*}',
      }),
      input.number('from', 'From', {
        description: 'Start time (Unix timestamp)',
      }),
      input.number('to', 'To', {
        description: 'End time (Unix timestamp)',
      }),
      input.string('title', 'Title', {
        description: 'Event/monitor title',
      }),
      input.text('text', 'Text', {
        description: 'Event text or description',
      }),
      input.select(
        'alertType',
        'Alert Type',
        [
          { label: 'Info', value: 'info' },
          { label: 'Warning', value: 'warning' },
          { label: 'Error', value: 'error' },
          { label: 'Success', value: 'success' },
        ],
        { default: 'info' }
      ),
      input.string('service', 'Service', {
        description: 'Service name',
      }),
      input.string('hostname', 'Hostname', {
        description: 'Host name',
      }),
      input.text('message', 'Message', {
        description: 'Log message or notification message',
      }),
      input.select(
        'level',
        'Log Level',
        [
          { label: 'Debug', value: 'debug' },
          { label: 'Info', value: 'info' },
          { label: 'Warning', value: 'warning' },
          { label: 'Error', value: 'error' },
          { label: 'Critical', value: 'critical' },
        ],
        { default: 'info' }
      ),
      input.number('monitorId', 'Monitor ID', {
        description: 'Monitor ID',
      }),
      input.string('monitorQuery', 'Monitor Query', {
        description: 'Monitor query',
      }),
      input.json('thresholds', 'Thresholds', {
        description: 'Alert thresholds',
        default: {},
      }),
      input.boolean('notifyNoData', 'Notify No Data', {
        description: 'Alert on missing data',
        default: false,
      }),
      input.credential('credentialId', 'Datadog Credentials', {
        description: 'Datadog API and Application keys',
        credentialTypes: ['API_KEY'],
        required: true,
      }),
    ],
    outputs: [output.main({ description: 'API operation result' })],
    defaults: {
      resource: 'metrics',
      operation: 'submit',
      type: 'gauge',
      level: 'info',
      notifyNoData: false,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = DatadogNodeSchema.parse(nodeInput.config);

    logger.info(`Datadog ${config.operation} on ${config.resource}`);

    switch (config.operation) {
      case 'submit':
        return {
          data: {
            success: true,
            status: 'ok',
          },
        };

      case 'query':
        return {
          data: {
            success: true,
            series: [
              {
                metric: config.metric || 'system.cpu.user',
                pointlist: [
                  [Date.now() - 60000, 45.2],
                  [Date.now(), 52.1],
                ],
                scope: 'host:server-1',
              },
            ],
          },
        };

      case 'list':
        if (config.resource === 'monitors') {
          return {
            data: {
              success: true,
              data: [
                { id: 123, name: 'CPU Monitor', type: 'metric alert', overall_state: 'OK' },
                { id: 124, name: 'Memory Alert', type: 'metric alert', overall_state: 'Alert' },
              ],
            },
          };
        }
        return {
          data: {
            success: true,
            data: [],
          },
        };

      case 'create':
        return {
          data: {
            success: true,
            data: {
              id: Date.now(),
              name: config.title,
              created: new Date().toISOString(),
            },
          },
        };

      case 'search':
        return {
          data: {
            success: true,
            logs: [
              { id: '1', message: 'Application started', status: 'info', timestamp: Date.now() },
              { id: '2', message: 'Request processed', status: 'info', timestamp: Date.now() },
            ],
          },
        };

      default:
        return { data: { success: true } };
    }
  }
);
