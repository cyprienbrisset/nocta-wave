export { postgresNode } from './postgres';
export { mysqlNode } from './mysql';
export { mongodbNode } from './mongodb';
export { redisNode } from './redis';
export { sqliteNode } from './sqlite';
export { elasticsearchNode } from './elasticsearch';
export { clickhouseNode } from './clickhouse';
export { supabaseNode } from './supabase';
export { firebaseNode } from './firebase';
export { dynamodbNode } from './dynamodb';

import { postgresNode } from './postgres';
import { mysqlNode } from './mysql';
import { mongodbNode } from './mongodb';
import { redisNode } from './redis';
import { sqliteNode } from './sqlite';
import { elasticsearchNode } from './elasticsearch';
import { clickhouseNode } from './clickhouse';
import { supabaseNode } from './supabase';
import { firebaseNode } from './firebase';
import { dynamodbNode } from './dynamodb';
import type { NodeDefinition } from '@ws-flows/shared';

export const databaseNodes: NodeDefinition[] = [
  postgresNode,
  mysqlNode,
  mongodbNode,
  redisNode,
  sqliteNode,
  elasticsearchNode,
  clickhouseNode,
  supabaseNode,
  firebaseNode,
  dynamodbNode,
];
