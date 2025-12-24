#!/usr/bin/env ts-node

/**
 * E2E Test Database Setup Script
 *
 * This script:
 * 1. Creates the test database if it doesn't exist
 * 2. Runs Prisma migrations
 * 3. Optionally seeds test data
 *
 * Usage:
 *   npx ts-node apps/api/test/e2e/scripts/setup-test-db.ts
 */

import { execSync } from 'child_process';
import { Client } from 'pg';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5435/wsflows_test';

async function waitForDatabase(maxRetries = 30, delayMs = 1000): Promise<void> {
  // Parse connection string
  const url = new URL(TEST_DATABASE_URL);
  const client = new Client({
    host: url.hostname,
    port: parseInt(url.port || '5432'),
    user: url.username,
    password: url.password,
    database: 'postgres', // Connect to default database first
  });

  for (let i = 0; i < maxRetries; i++) {
    try {
      await client.connect();
      console.log('✓ Database is ready');
      await client.end();
      return;
    } catch (error) {
      console.log(`Waiting for database... (${i + 1}/${maxRetries})`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error('Database not ready after maximum retries');
}

async function createTestDatabase(): Promise<void> {
  const url = new URL(TEST_DATABASE_URL);
  const dbName = url.pathname.slice(1); // Remove leading /

  const client = new Client({
    host: url.hostname,
    port: parseInt(url.port || '5432'),
    user: url.username,
    password: url.password,
    database: 'postgres',
  });

  try {
    await client.connect();

    // Check if database exists
    const result = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName],
    );

    if (result.rows.length === 0) {
      console.log(`Creating test database: ${dbName}`);
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log('✓ Test database created');
    } else {
      console.log('✓ Test database already exists');
    }
  } finally {
    await client.end();
  }
}

async function runMigrations(): Promise<void> {
  console.log('Running Prisma migrations...');

  try {
    execSync(`npx prisma migrate deploy`, {
      cwd: process.cwd().includes('apps/api')
        ? process.cwd()
        : `${process.cwd()}/apps/api`,
      env: {
        ...process.env,
        DATABASE_URL: TEST_DATABASE_URL,
      },
      stdio: 'inherit',
    });
    console.log('✓ Migrations completed');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

async function generatePrismaClient(): Promise<void> {
  console.log('Generating Prisma client...');

  try {
    execSync(`npx prisma generate`, {
      cwd: process.cwd().includes('apps/api')
        ? process.cwd()
        : `${process.cwd()}/apps/api`,
      stdio: 'inherit',
    });
    console.log('✓ Prisma client generated');
  } catch (error) {
    console.error('Prisma generate failed:', error);
    throw error;
  }
}

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('E2E Test Database Setup');
  console.log('='.repeat(60));
  console.log(`Database URL: ${TEST_DATABASE_URL}`);
  console.log('');

  try {
    await waitForDatabase();
    await createTestDatabase();
    await generatePrismaClient();
    await runMigrations();

    console.log('');
    console.log('='.repeat(60));
    console.log('✓ E2E test database is ready!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

main();
