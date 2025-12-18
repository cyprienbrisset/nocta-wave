export { manualTrigger } from './manual';
export { cronTrigger } from './cron';
export { webhookTrigger } from './webhook';
export { httpPollTrigger } from './http-poll';
export { eventTrigger } from './event';
export { fileWatchTrigger } from './file-watch';
export { databaseTrigger } from './database';
export { queueTrigger } from './queue';

import { manualTrigger } from './manual';
import { cronTrigger } from './cron';
import { webhookTrigger } from './webhook';
import { httpPollTrigger } from './http-poll';
import { eventTrigger } from './event';
import { fileWatchTrigger } from './file-watch';
import { databaseTrigger } from './database';
import { queueTrigger } from './queue';
import type { NodeDefinition } from '@ws-flows/shared';

export const triggerNodes: NodeDefinition[] = [
  manualTrigger,
  cronTrigger,
  webhookTrigger,
  httpPollTrigger,
  eventTrigger,
  fileWatchTrigger,
  databaseTrigger,
  queueTrigger,
];
