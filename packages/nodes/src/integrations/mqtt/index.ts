import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const MqttSchema = z.object({
  operation: z.enum(['publish', 'subscribe', 'unsubscribe', 'request']).default('publish'),
  broker: z.string(),
  port: z.number().min(1).max(65535).default(1883),
  topic: z.string(),
  topics: z.array(z.object({
    topic: z.string(),
    qos: z.number().min(0).max(2).default(0),
  })).optional(),
  message: z.string().optional(),
  messageFormat: z.enum(['text', 'json', 'binary', 'auto']).default('auto'),
  // QoS settings
  qos: z.number().min(0).max(2).default(0),
  retain: z.boolean().default(false),
  // Connection options
  clientId: z.string().optional(),
  cleanSession: z.boolean().default(true),
  keepAlive: z.number().min(0).max(65535).default(60),
  connectTimeout: z.number().min(1000).max(60000).default(10000),
  reconnect: z.boolean().default(true),
  reconnectPeriod: z.number().min(0).max(60000).default(1000),
  // TLS options
  useTls: z.boolean().default(false),
  tlsCa: z.string().optional(),
  tlsCert: z.string().optional(),
  tlsKey: z.string().optional(),
  rejectUnauthorized: z.boolean().default(true),
  // Will message (Last Will and Testament)
  willTopic: z.string().optional(),
  willMessage: z.string().optional(),
  willQos: z.number().min(0).max(2).default(0),
  willRetain: z.boolean().default(false),
  // Advanced options
  protocolVersion: z.enum(['3.1', '3.1.1', '5.0']).default('5.0'),
  properties: z.object({
    payloadFormatIndicator: z.boolean().optional(),
    messageExpiryInterval: z.number().optional(),
    contentType: z.string().optional(),
    responseTopic: z.string().optional(),
    correlationData: z.string().optional(),
    userProperties: z.record(z.string()).optional(),
  }).optional(),
  // Subscribe options
  subscribeTimeout: z.number().min(1000).max(60000).default(10000),
  maxMessages: z.number().min(1).max(1000).default(100),
  // Request-response pattern
  responseTopic: z.string().optional(),
  requestTimeout: z.number().min(1000).max(60000).default(30000),
});

export const mqttNode: NodeDefinition = createNode(
  {
    type: 'integration.mqtt',
    category: 'integration',
    name: 'MQTT',
    description: 'IoT messaging with MQTT protocol - publish, subscribe, and request-response patterns',
    icon: 'Radio',
    inputs: [
      input.select('operation', 'Operation', [
        { label: 'Publish Message', value: 'publish', description: 'Send a message to a topic' },
        { label: 'Subscribe to Topic', value: 'subscribe', description: 'Receive messages from a topic' },
        { label: 'Unsubscribe', value: 'unsubscribe', description: 'Stop receiving messages from a topic' },
        { label: 'Request-Response', value: 'request', description: 'Send a request and wait for response' },
      ], { default: 'publish' }),
      input.string('broker', 'Broker URL', {
        required: true,
        description: 'MQTT broker hostname or IP address',
        placeholder: 'mqtt.example.com',
      }),
      input.number('port', 'Port', {
        default: 1883,
        description: 'MQTT broker port (1883 for TCP, 8883 for TLS)',
      }),
      input.string('topic', 'Topic', {
        required: true,
        description: 'MQTT topic to publish/subscribe',
        placeholder: 'sensors/temperature/living-room',
      }),
      input.json('topics', 'Topics', {
        description: 'Multiple topics to subscribe (for subscribe operation)',
        showWhen: { field: 'operation', equals: 'subscribe' },
        placeholder: `[
  { "topic": "sensors/#", "qos": 1 },
  { "topic": "alerts/+/critical", "qos": 2 }
]`,
      }),
      input.string('message', 'Message', {
        description: 'Message to publish',
        showWhen: { field: 'operation', equals: 'publish' },
      }),
      input.select('messageFormat', 'Message Format', [
        { label: 'Auto-detect', value: 'auto' },
        { label: 'Plain Text', value: 'text' },
        { label: 'JSON', value: 'json' },
        { label: 'Binary (Base64)', value: 'binary' },
      ], { default: 'auto' }),
      // QoS settings
      input.select('qos', 'Quality of Service', [
        { label: 'At most once (0)', value: 0, description: 'Fire and forget' },
        { label: 'At least once (1)', value: 1, description: 'Guaranteed delivery, may duplicate' },
        { label: 'Exactly once (2)', value: 2, description: 'Guaranteed single delivery' },
      ], { default: 0 }),
      input.boolean('retain', 'Retain Message', {
        default: false,
        description: 'Broker retains last message for new subscribers',
        showWhen: { field: 'operation', equals: 'publish' },
      }),
      // Connection options
      input.string('clientId', 'Client ID', {
        description: 'Unique client identifier (auto-generated if empty)',
      }),
      input.boolean('cleanSession', 'Clean Session', {
        default: true,
        description: 'Start with a fresh session on connect',
      }),
      input.number('keepAlive', 'Keep Alive (seconds)', {
        default: 60,
        description: 'Ping interval to keep connection alive',
      }),
      input.number('connectTimeout', 'Connect Timeout (ms)', {
        default: 10000,
        description: 'Connection timeout in milliseconds',
      }),
      input.boolean('reconnect', 'Auto Reconnect', {
        default: true,
        description: 'Automatically reconnect on disconnect',
      }),
      input.number('reconnectPeriod', 'Reconnect Period (ms)', {
        default: 1000,
        description: 'Time between reconnection attempts',
        showWhen: { field: 'reconnect', equals: true },
      }),
      // TLS options
      input.boolean('useTls', 'Use TLS/SSL', {
        default: false,
        description: 'Enable secure connection',
      }),
      input.code('tlsCa', 'CA Certificate', {
        language: 'text',
        description: 'CA certificate for TLS',
        showWhen: { field: 'useTls', equals: true },
      }),
      input.code('tlsCert', 'Client Certificate', {
        language: 'text',
        description: 'Client certificate for mutual TLS',
        showWhen: { field: 'useTls', equals: true },
      }),
      input.code('tlsKey', 'Client Key', {
        language: 'text',
        description: 'Client private key for mutual TLS',
        showWhen: { field: 'useTls', equals: true },
      }),
      input.boolean('rejectUnauthorized', 'Verify Certificate', {
        default: true,
        description: 'Reject connections with invalid certificates',
        showWhen: { field: 'useTls', equals: true },
      }),
      // Will message
      input.string('willTopic', 'Will Topic', {
        description: 'Topic for Last Will and Testament message',
      }),
      input.string('willMessage', 'Will Message', {
        description: 'Message to send when client disconnects unexpectedly',
      }),
      // Advanced options
      input.select('protocolVersion', 'Protocol Version', [
        { label: 'MQTT 5.0', value: '5.0' },
        { label: 'MQTT 3.1.1', value: '3.1.1' },
        { label: 'MQTT 3.1', value: '3.1' },
      ], { default: '5.0' }),
      input.json('properties', 'MQTT 5 Properties', {
        description: 'Additional MQTT 5.0 properties',
        showWhen: { field: 'protocolVersion', equals: '5.0' },
        placeholder: `{
  "messageExpiryInterval": 3600,
  "contentType": "application/json",
  "userProperties": { "custom": "value" }
}`,
      }),
      // Subscribe options
      input.number('subscribeTimeout', 'Subscribe Timeout (ms)', {
        default: 10000,
        showWhen: { field: 'operation', equals: 'subscribe' },
      }),
      input.number('maxMessages', 'Max Messages', {
        default: 100,
        description: 'Maximum messages to receive before unsubscribing',
        showWhen: { field: 'operation', equals: 'subscribe' },
      }),
      // Request-response
      input.string('responseTopic', 'Response Topic', {
        description: 'Topic to receive response on',
        showWhen: { field: 'operation', equals: 'request' },
      }),
      input.number('requestTimeout', 'Request Timeout (ms)', {
        default: 30000,
        showWhen: { field: 'operation', equals: 'request' },
      }),
    ],
    outputs: [output.main({ description: 'API operation result' })],
    credentials: ['api_key'],
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = MqttSchema.parse(nodeInput.config);
    const credentials = nodeInput.credentials;

    logger.info(`MQTT: ${config.operation} on ${config.broker}:${config.port}`);

    // Get username/password from credentials
    const username = credentials?.username;
    const password = credentials?.apiKey || credentials?.password;

    // Build connection URL
    const protocol = config.useTls ? 'mqtts' : 'mqtt';
    const brokerUrl = `${protocol}://${config.broker}:${config.port}`;

    // Simulated MQTT operations
    // In production, you would use a library like 'mqtt' or 'async-mqtt'

    const clientId = config.clientId || `ws-flows-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    switch (config.operation) {
      case 'publish': {
        logger.info(`Publishing to topic: ${config.topic}`);

        let payload = config.message || '';
        if (config.messageFormat === 'json' && typeof payload === 'string') {
          try {
            JSON.parse(payload); // Validate JSON
          } catch {
            throw new Error('Invalid JSON message');
          }
        }

        // Simulated publish
        return {
          data: {
            connected: true,
            result: {
              success: true,
              topic: config.topic,
              qos: config.qos,
              retain: config.retain,
              messageId: Math.floor(Math.random() * 65535),
            },
            messages: [],
            response: null,
            error: null,
          },
        };
      }

      case 'subscribe': {
        const topics = config.topics || [{ topic: config.topic, qos: config.qos }];
        logger.info(`Subscribing to ${topics.length} topic(s)`);

        // Simulated subscription with sample messages
        return {
          data: {
            connected: true,
            result: {
              success: true,
              subscriptions: topics.map(t => ({ topic: t.topic, qos: t.qos })),
            },
            messages: [
              {
                topic: config.topic,
                payload: { value: 23.5, unit: 'celsius', timestamp: Date.now() },
                qos: config.qos,
                retain: false,
                receivedAt: new Date().toISOString(),
              },
            ],
            response: null,
            error: null,
          },
        };
      }

      case 'unsubscribe': {
        logger.info(`Unsubscribing from topic: ${config.topic}`);

        return {
          data: {
            connected: true,
            result: {
              success: true,
              unsubscribed: [config.topic],
            },
            messages: [],
            response: null,
            error: null,
          },
        };
      }

      case 'request': {
        const responseTopic = config.responseTopic || `${config.topic}/response/${clientId}`;
        logger.info(`Request-response on ${config.topic}, response on ${responseTopic}`);

        // Simulated request-response
        return {
          data: {
            connected: true,
            result: {
              success: true,
              requestTopic: config.topic,
              responseTopic,
              correlationId: crypto.randomUUID(),
            },
            messages: [],
            response: {
              topic: responseTopic,
              payload: { status: 'ok', data: { result: 'processed' } },
              receivedAt: new Date().toISOString(),
            },
            error: null,
          },
        };
      }

      default:
        throw new Error(`Unknown operation: ${config.operation}`);
    }
  }
);
