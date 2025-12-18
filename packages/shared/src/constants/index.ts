// Constants

// User roles
export const USER_ROLES = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
  VIEWER: 'VIEWER',
} as const;

export const ROLE_HIERARCHY: Record<string, number> = {
  OWNER: 4,
  ADMIN: 3,
  MEMBER: 2,
  VIEWER: 1,
};

// Execution status
export const EXECUTION_STATUS = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;

// Log levels
export const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
} as const;

// Trigger types
export const TRIGGER_TYPES = {
  MANUAL: 'manual',
  CRON: 'cron',
  WEBHOOK: 'webhook',
  HTTP: 'http',
} as const;

// Node categories
export const NODE_CATEGORIES = {
  TRIGGER: 'trigger',
  HTTP: 'http',
  TRANSFORM: 'transform',
  LOGIC: 'logic',
  DATABASE: 'database',
  INTEGRATION: 'integration',
  UTILITY: 'utility',
} as const;

// Credential types
export const CREDENTIAL_TYPES = {
  API_KEY: 'api_key',
  OAUTH2: 'oauth2',
  BASIC_AUTH: 'basic_auth',
  CUSTOM: 'custom',
} as const;

// API limits
export const API_LIMITS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  RATE_LIMIT_AUTH: 10,
  RATE_LIMIT_READ: 100,
  RATE_LIMIT_WRITE: 30,
  RATE_LIMIT_EXECUTE: 60,
} as const;

// Defaults
export const DEFAULTS = {
  WORKFLOW_TIMEOUT: 300000, // 5 minutes
  RETRY_MAX_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  RETRY_BACKOFF_MULTIPLIER: 2,
  JWT_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '7d',
} as const;

// WebSocket events
export const WS_EVENTS = {
  EXECUTION_START: 'execution:start',
  EXECUTION_LOG: 'execution:log',
  EXECUTION_STEP: 'execution:step',
  EXECUTION_COMPLETE: 'execution:complete',
} as const;
