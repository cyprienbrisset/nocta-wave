/**
 * Mock External Services
 *
 * Provides mocks for external service integrations (Redis, etc.)
 */

/**
 * Mock Redis Client
 */
export const createMockRedis = () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  keys: jest.fn().mockResolvedValue([]),
  expire: jest.fn(),
  hget: jest.fn(),
  hset: jest.fn(),
  hdel: jest.fn(),
  hgetall: jest.fn(),
  lpush: jest.fn(),
  rpush: jest.fn(),
  lpop: jest.fn(),
  rpop: jest.fn(),
  lrange: jest.fn().mockResolvedValue([]),
  publish: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  on: jest.fn(),
  disconnect: jest.fn(),
  quit: jest.fn(),
});

/**
 * Mock Event Emitter
 */
export const createMockEventEmitter = () => ({
  emit: jest.fn(),
  on: jest.fn(),
  once: jest.fn(),
  off: jest.fn(),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn(),
  listeners: jest.fn().mockReturnValue([]),
});

/**
 * Mock Trigger.dev Client
 */
export const createMockTriggerClient = () => ({
  sendEvent: jest.fn().mockResolvedValue({ id: 'event-123' }),
  getRunStatus: jest.fn().mockResolvedValue({ status: 'SUCCESS' }),
  cancelRun: jest.fn().mockResolvedValue({ success: true }),
});

/**
 * Mock Webhook Service
 */
export const createMockWebhookService = () => ({
  createWebhook: jest.fn().mockResolvedValue({
    id: 'webhook-123',
    url: 'https://webhook.example.com/hook-123',
  }),
  deleteWebhook: jest.fn().mockResolvedValue(undefined),
  processWebhook: jest.fn().mockResolvedValue({ processed: true }),
  verifySignature: jest.fn().mockReturnValue(true),
});

/**
 * Mock Email Service
 */
export const createMockEmailService = () => ({
  send: jest.fn().mockResolvedValue({ messageId: 'msg-123' }),
  sendTemplate: jest.fn().mockResolvedValue({ messageId: 'msg-123' }),
});

/**
 * Mock Storage Service (S3-like)
 */
export const createMockStorageService = () => ({
  upload: jest.fn().mockResolvedValue({ url: 'https://storage.example.com/file.txt' }),
  download: jest.fn().mockResolvedValue(Buffer.from('file content')),
  delete: jest.fn().mockResolvedValue(undefined),
  getSignedUrl: jest.fn().mockResolvedValue('https://storage.example.com/signed-url'),
  listObjects: jest.fn().mockResolvedValue([]),
});

/**
 * Mock HTTP Client for external API calls
 */
export const createMockHttpClient = () => ({
  get: jest.fn().mockResolvedValue({ data: {}, status: 200 }),
  post: jest.fn().mockResolvedValue({ data: {}, status: 201 }),
  put: jest.fn().mockResolvedValue({ data: {}, status: 200 }),
  patch: jest.fn().mockResolvedValue({ data: {}, status: 200 }),
  delete: jest.fn().mockResolvedValue({ data: {}, status: 204 }),
});
