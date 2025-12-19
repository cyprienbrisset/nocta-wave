/**
 * @ws-flows/nodes
 *
 * Node SDK for WS-Flows - A workflow orchestration platform
 *
 * This package provides:
 * - 85+ pre-built nodes for common integrations
 * - A registry system for managing nodes
 * - Helpers for creating custom nodes
 * - Type definitions for node development
 */

// Types
export * from './types';

// Registry
export {
  NodeRegistry,
  nodeRegistry,
  registerNode,
  registerNodes,
  getNode,
  getAllNodes,
  getNodesByCategory,
  getNodeMetadata,
  getAllNodeMetadata,
} from './registry';

// Node creation helpers
export { createNode, input, output } from './create-node';

// ============================================================================
// TRIGGER NODES (8)
// ============================================================================
export {
  manualTrigger,
  cronTrigger,
  webhookTrigger,
  httpPollTrigger,
  eventTrigger,
  fileWatchTrigger,
  databaseTrigger,
  queueTrigger,
  triggerNodes,
} from './triggers';

// ============================================================================
// HTTP NODES (2)
// ============================================================================
export { httpRequest, httpResponse, httpNodes } from './http';

// ============================================================================
// TRANSFORM NODES (8)
// ============================================================================
export {
  setNode,
  mapNode,
  filterNode,
  mergeNode,
  splitNode,
  aggregateNode,
  sortNode,
  codeNode,
  transformNodes,
} from './transform';

// ============================================================================
// LOGIC NODES (5)
// ============================================================================
export {
  conditionNode,
  switchNode,
  loopNode,
  waitNode,
  stopNode,
  logicNodes,
} from './logic';

// ============================================================================
// DATABASE NODES (4)
// ============================================================================
export {
  postgresNode,
  mysqlNode,
  mongodbNode,
  redisNode,
  databaseNodes,
} from './database';

// ============================================================================
// INTEGRATION NODES (53)
// ============================================================================
export {
  // Communication
  slackNode,
  discordNode,
  gmailNode,
  twilioNode,
  sendgridNode,
  teamsNode,
  telegramNode,
  whatsappNode,
  intercomNode,
  zendeskNode,
  // Productivity
  githubNode,
  googleSheetsNode,
  notionNode,
  airtableNode,
  webflowNode,
  // Project Management
  jiraNode,
  asanaNode,
  trelloNode,
  linearNode,
  mondayNode,
  clickupNode,
  // CRM & Sales
  salesforceNode,
  hubspotNode,
  pipedriveNode,
  zohoCrmNode,
  // E-commerce
  shopifyNode,
  woocommerceNode,
  magentoNode,
  bigcommerceNode,
  // Marketing & Analytics
  mailchimpNode,
  googleAnalyticsNode,
  facebookAdsNode,
  googleAdsNode,
  segmentNode,
  mixpanelNode,
  // Payments
  stripeNode,
  // Cloud Storage
  awsS3Node,
  gcsNode,
  azureBlobNode,
  dropboxNode,
  ftpNode,
  // Messaging & Queues
  rabbitmqNode,
  awsSqsNode,
  kafkaNode,
  googlePubSubNode,
  // AI & ML
  openaiNode,
  anthropicNode,
  googleAINode,
  huggingfaceNode,
  replicateNode,
  // Vector DBs
  pineconeNode,
  weaviateNode,
  // Other
  rssNode,
  integrationNodes,
} from './integrations';

// ============================================================================
// UTILITY NODES (8)
// ============================================================================
export {
  delayNode,
  cryptoNode,
  datetimeNode,
  htmlParseNode,
  logNode,
  debugNode,
  jsonParseNode,
  errorNode,
  utilityNodes,
} from './utility';

// ============================================================================
// FLOW NODES (3) - Sub-workflows
// ============================================================================
export {
  subWorkflowNode,
  subWorkflowInputNode,
  subWorkflowOutputNode,
  SubWorkflowSchema,
  type SubWorkflowConfig,
  type SubWorkflowInputParam,
  type SubWorkflowOutputParam,
  type SubWorkflowMetadata,
} from './flow';

// ============================================================================
// ALL NODES
// ============================================================================
import { triggerNodes } from './triggers';
import { httpNodes } from './http';
import { transformNodes } from './transform';
import { logicNodes } from './logic';
import { databaseNodes } from './database';
import { integrationNodes } from './integrations';
import { utilityNodes } from './utility';
import { subWorkflowNode, subWorkflowInputNode, subWorkflowOutputNode } from './flow';
import { nodeRegistry } from './registry';
import type { NodeDefinition } from '@ws-flows/shared';

/**
 * Flow nodes for sub-workflows
 */
export const flowNodes: NodeDefinition[] = [
  subWorkflowNode,
  subWorkflowInputNode,
  subWorkflowOutputNode,
];

/**
 * All pre-built nodes (91 total)
 */
export const allNodes: NodeDefinition[] = [
  ...triggerNodes,
  ...httpNodes,
  ...transformNodes,
  ...logicNodes,
  ...databaseNodes,
  ...integrationNodes,
  ...utilityNodes,
  ...flowNodes,
];

/**
 * Register all pre-built nodes in the registry
 * Call this function to initialize all nodes
 */
export function registerAllNodes(): void {
  nodeRegistry.registerMany(allNodes);
}

/**
 * Get nodes organized by category
 */
export function getNodesByCategories(): Record<string, NodeDefinition[]> {
  return {
    trigger: triggerNodes,
    http: httpNodes,
    transform: transformNodes,
    logic: logicNodes,
    database: databaseNodes,
    integration: integrationNodes,
    utility: utilityNodes,
    flow: flowNodes,
  };
}

/**
 * Node count summary
 */
export const NODE_COUNTS = {
  trigger: triggerNodes.length,
  http: httpNodes.length,
  transform: transformNodes.length,
  logic: logicNodes.length,
  database: databaseNodes.length,
  integration: integrationNodes.length,
  utility: utilityNodes.length,
  flow: flowNodes.length,
  total: allNodes.length,
} as const;

// Auto-register all nodes when the module is imported
registerAllNodes();
