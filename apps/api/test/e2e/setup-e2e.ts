/**
 * E2E Test Setup
 *
 * This module provides infrastructure for running true end-to-end tests
 * against a real database, Redis, and the full NestJS application.
 *
 * Requirements:
 * - Docker containers running (postgres, redis)
 * - Test database created and migrated
 */

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

// Test environment configuration
const TEST_CONFIG = {
  DATABASE_URL:
    process.env.TEST_DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5434/wsflows_test',
  REDIS_URL: process.env.TEST_REDIS_URL || 'redis://localhost:6380/1',
  JWT_SECRET: 'test-jwt-secret-for-e2e-tests',
  ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef', // 32 chars for AES-256
};

// Global test state
let app: INestApplication;
let prisma: PrismaClient;
let redis: Redis;
let moduleRef: TestingModule;

/**
 * Initialize the test environment
 * Call this in beforeAll() of your test suite
 */
export async function initializeE2ETestEnvironment(): Promise<{
  app: INestApplication;
  prisma: PrismaClient;
  redis: Redis;
}> {
  // Set test environment variables
  process.env.DATABASE_URL = TEST_CONFIG.DATABASE_URL;
  process.env.REDIS_URL = TEST_CONFIG.REDIS_URL;
  process.env.JWT_SECRET = TEST_CONFIG.JWT_SECRET;
  process.env.ENCRYPTION_KEY = TEST_CONFIG.ENCRYPTION_KEY;
  process.env.NODE_ENV = 'test';

  // Create Prisma client for test database
  prisma = new PrismaClient({
    datasources: {
      db: { url: TEST_CONFIG.DATABASE_URL },
    },
  });

  // Create Redis client for test database (db 1)
  redis = new Redis(TEST_CONFIG.REDIS_URL);

  // Build NestJS application
  moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleRef.createNestApplication();

  // Apply same configuration as production
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.setGlobalPrefix('api/v1');

  await app.init();

  return { app, prisma, redis };
}

/**
 * Clean up the test environment
 * Call this in afterAll() of your test suite
 */
export async function teardownE2ETestEnvironment(): Promise<void> {
  if (app) {
    await app.close();
  }
  if (prisma) {
    await prisma.$disconnect();
  }
  if (redis) {
    await redis.quit();
  }
}

/**
 * Clean all test data from the database
 * Call this in beforeEach() or afterEach() to ensure test isolation
 */
export async function cleanDatabase(): Promise<void> {
  const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `;

  const tables = tablenames
    .map(({ tablename }) => tablename)
    .filter((name) => name !== '_prisma_migrations')
    .map((name) => `"public"."${name}"`)
    .join(', ');

  if (tables.length > 0) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
  }
}

/**
 * Clean all test data from Redis
 */
export async function cleanRedis(): Promise<void> {
  await redis.flushdb();
}

/**
 * Clean both database and Redis
 */
export async function cleanAll(): Promise<void> {
  await Promise.all([cleanDatabase(), cleanRedis()]);
}

/**
 * Get the test application instance
 */
export function getApp(): INestApplication {
  return app;
}

/**
 * Get the test Prisma client
 */
export function getPrisma(): PrismaClient {
  return prisma;
}

/**
 * Get the test Redis client
 */
export function getRedis(): Redis {
  return redis;
}

/**
 * Create a supertest request agent for the test app
 */
export function createRequest() {
  return request(app.getHttpServer());
}

/**
 * Helper to create an authenticated request
 */
export async function createAuthenticatedRequest(userId?: string) {
  const agent = createRequest();

  // Create a test user and get JWT token
  const loginResponse = await agent
    .post('/api/v1/auth/login')
    .send({ email: 'test@example.com', password: 'TestPassword123!' });

  const token = loginResponse.body.accessToken;

  return {
    agent,
    token,
    get: (url: string) => agent.get(url).set('Authorization', `Bearer ${token}`),
    post: (url: string) => agent.post(url).set('Authorization', `Bearer ${token}`),
    put: (url: string) => agent.put(url).set('Authorization', `Bearer ${token}`),
    patch: (url: string) => agent.patch(url).set('Authorization', `Bearer ${token}`),
    delete: (url: string) => agent.delete(url).set('Authorization', `Bearer ${token}`),
  };
}

/**
 * Wait for a condition to be true (polling)
 */
export async function waitFor(
  condition: () => Promise<boolean>,
  options: { timeout?: number; interval?: number } = {},
): Promise<void> {
  const { timeout = 10000, interval = 100 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Wait for an execution to complete
 */
export async function waitForExecutionComplete(
  executionId: string,
  options: { timeout?: number } = {},
): Promise<void> {
  const { timeout = 30000 } = options;

  await waitFor(
    async () => {
      const execution = await prisma.execution.findUnique({
        where: { id: executionId },
      });
      return (
        execution?.status === 'SUCCESS' ||
        execution?.status === 'FAILED' ||
        execution?.status === 'CANCELLED'
      );
    },
    { timeout },
  );
}

/**
 * Subscribe to Redis channel and collect messages
 */
export function subscribeToChannel(channel: string): {
  messages: any[];
  unsubscribe: () => Promise<void>;
} {
  const subscriber = redis.duplicate();
  const messages: any[] = [];

  subscriber.subscribe(channel);
  subscriber.on('message', (_ch, message) => {
    try {
      messages.push(JSON.parse(message));
    } catch {
      messages.push(message);
    }
  });

  return {
    messages,
    unsubscribe: async () => {
      await subscriber.unsubscribe(channel);
      await subscriber.quit();
    },
  };
}
