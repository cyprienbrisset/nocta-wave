import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const EventTriggerSchema = z.object({
  eventType: z.string().min(1),
  eventSource: z.string().optional(),
  filters: z.record(z.unknown()).optional(),
  debounceMs: z.number().min(0).optional(),
});

export type EventTriggerConfig = z.infer<typeof EventTriggerSchema>;

export const eventTrigger: NodeDefinition = createNode(
  {
    type: 'trigger.event',
    category: 'trigger',
    name: 'Event Trigger',
    description: 'Trigger workflow based on internal system events',
    icon: 'Zap',
    inputs: [
      input.string('eventType', 'Event Type', {
        description: 'The type of event to listen for',
        placeholder: 'user.created',
        required: true,
      }),
      input.string('eventSource', 'Event Source', {
        description: 'Optional source/namespace for the event',
        placeholder: 'auth-service',
      }),
      input.json('filters', 'Event Filters', {
        description: 'JSON object to filter events (e.g., {"status": "active"})',
        default: {},
      }),
      input.number('debounceMs', 'Debounce (ms)', {
        description: 'Delay to debounce rapid events (0 = no debounce)',
        default: 0,
        min: 0,
        max: 60000,
      }),
    ],
    outputs: [
      output.string('eventType', 'Event type'),
      output.string('eventId', 'Event ID'),
      output.object('payload', 'Event payload'),
      output.object('metadata', 'Event metadata'),
      output.string('timestamp', 'Event timestamp'),
    ],
    defaults: {
      eventType: '',
      eventSource: '',
      filters: {},
      debounceMs: 0,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = EventTriggerSchema.parse(nodeInput.config);
    const data = nodeInput.data as Record<string, unknown>;

    logger.info(`Event trigger activated: ${config.eventType}`);

    return {
      data: {
        eventType: config.eventType,
        eventId: data.eventId || `evt_${Date.now()}`,
        payload: data.payload || {},
        metadata: {
          source: config.eventSource || 'internal',
          filters: config.filters,
          ...(data.metadata as object || {}),
        },
        timestamp: new Date().toISOString(),
        triggerType: 'event',
      },
    };
  }
);
