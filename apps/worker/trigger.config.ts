import { defineConfig } from '@trigger.dev/sdk/v3';

export default defineConfig({
  project: 'ws-flows-worker',
  runtime: 'node',
  logLevel: 'info',
  // Connect to self-hosted Trigger.dev instance
  triggerUrl: process.env.TRIGGER_API_URL || 'http://localhost:4002',
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ['./src/jobs'],
});
