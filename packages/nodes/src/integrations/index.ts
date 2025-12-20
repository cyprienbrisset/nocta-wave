// Communication
export { slackNode } from './slack';
export { discordNode } from './discord';
export { gmailNode } from './gmail';
export { twilioNode } from './twilio';
export { sendgridNode } from './sendgrid';
export { teamsNode } from './teams';
export { telegramNode } from './telegram';
export { whatsappNode } from './whatsapp';
export { intercomNode } from './intercom';
export { zendeskNode } from './zendesk';

// Productivity
export { githubNode } from './github';
export { googleSheetsNode } from './google-sheets';
export { notionNode } from './notion';
export { airtableNode } from './airtable';
export { webflowNode } from './webflow';

// Project Management
export { jiraNode } from './jira';
export { asanaNode } from './asana';
export { trelloNode } from './trello';
export { linearNode } from './linear';
export { mondayNode } from './monday';
export { clickupNode } from './clickup';

// CRM & Sales
export { salesforceNode } from './salesforce';
export { hubspotNode } from './hubspot';
export { pipedriveNode } from './pipedrive';
export { zohoCrmNode } from './zoho-crm';

// E-commerce
export { shopifyNode } from './shopify';
export { woocommerceNode } from './woocommerce';
export { magentoNode } from './magento';
export { bigcommerceNode } from './bigcommerce';

// Marketing & Analytics
export { mailchimpNode } from './mailchimp';
export { googleAnalyticsNode } from './google-analytics';
export { facebookAdsNode } from './facebook-ads';
export { googleAdsNode } from './google-ads';
export { segmentNode } from './segment';
export { mixpanelNode } from './mixpanel';

// Payments & Finance
export { stripeNode } from './stripe';
export { paypalNode } from './paypal';
export { plaidNode } from './plaid';
export { quickbooksNode } from './quickbooks';
export { xeroNode } from './xero';

// Cloud Storage
export { awsS3Node } from './aws-s3';
export { gcsNode } from './gcs';
export { azureBlobNode } from './azure-blob';
export { dropboxNode } from './dropbox';
export { ftpNode } from './ftp';

// Messaging & Queues
export { rabbitmqNode } from './rabbitmq';
export { awsSqsNode } from './aws-sqs';
export { kafkaNode } from './kafka';
export { googlePubSubNode } from './google-pubsub';

// AI & Machine Learning
export { openaiNode } from './openai';
export { anthropicNode } from './anthropic';
export { googleAINode } from './google-ai';
export { huggingfaceNode } from './huggingface';
export { replicateNode } from './replicate';

// Vector Databases
export { pineconeNode } from './pinecone';
export { weaviateNode } from './weaviate';

// DevOps & Infrastructure
export { dockerNode } from './docker';
export { kubernetesNode } from './kubernetes';
export { terraformNode } from './terraform';
export { awsLambdaNode } from './aws-lambda';
export { gcfNode } from './gcf';
export { datadogNode } from './datadog';
export { pagerdutyNode } from './pagerduty';

// Other
export { rssNode } from './rss';

// API & Development
export { graphqlNode } from './graphql';

// Browser Automation
export { puppeteerNode } from './puppeteer';

// IoT & Messaging
export { mqttNode } from './mqtt';

// Source Control
export { gitlabNode } from './gitlab';
export { bitbucketNode } from './bitbucket';

// Imports for array
import { slackNode } from './slack';
import { discordNode } from './discord';
import { githubNode } from './github';
import { gmailNode } from './gmail';
import { googleSheetsNode } from './google-sheets';
import { notionNode } from './notion';
import { airtableNode } from './airtable';
import { stripeNode } from './stripe';
import { twilioNode } from './twilio';
import { sendgridNode } from './sendgrid';
import { awsS3Node } from './aws-s3';
import { openaiNode } from './openai';
import { rssNode } from './rss';
import { webflowNode } from './webflow';
import { gcsNode } from './gcs';
import { azureBlobNode } from './azure-blob';
import { dropboxNode } from './dropbox';
import { ftpNode } from './ftp';
import { rabbitmqNode } from './rabbitmq';
import { awsSqsNode } from './aws-sqs';
import { kafkaNode } from './kafka';
import { googlePubSubNode } from './google-pubsub';
import { anthropicNode } from './anthropic';
import { googleAINode } from './google-ai';
import { huggingfaceNode } from './huggingface';
import { replicateNode } from './replicate';
import { pineconeNode } from './pinecone';
import { weaviateNode } from './weaviate';

// Communication
import { teamsNode } from './teams';
import { telegramNode } from './telegram';
import { whatsappNode } from './whatsapp';
import { intercomNode } from './intercom';
import { zendeskNode } from './zendesk';

// Project Management
import { jiraNode } from './jira';
import { asanaNode } from './asana';
import { trelloNode } from './trello';
import { linearNode } from './linear';
import { mondayNode } from './monday';
import { clickupNode } from './clickup';

// CRM & Sales
import { salesforceNode } from './salesforce';
import { hubspotNode } from './hubspot';
import { pipedriveNode } from './pipedrive';
import { zohoCrmNode } from './zoho-crm';

// E-commerce
import { shopifyNode } from './shopify';
import { woocommerceNode } from './woocommerce';
import { magentoNode } from './magento';
import { bigcommerceNode } from './bigcommerce';

// Marketing & Analytics
import { mailchimpNode } from './mailchimp';
import { googleAnalyticsNode } from './google-analytics';
import { facebookAdsNode } from './facebook-ads';
import { googleAdsNode } from './google-ads';
import { segmentNode } from './segment';
import { mixpanelNode } from './mixpanel';

// Finance & Payments
import { paypalNode } from './paypal';
import { plaidNode } from './plaid';
import { quickbooksNode } from './quickbooks';
import { xeroNode } from './xero';

// DevOps & Infrastructure
import { dockerNode } from './docker';
import { kubernetesNode } from './kubernetes';
import { terraformNode } from './terraform';
import { awsLambdaNode } from './aws-lambda';
import { gcfNode } from './gcf';
import { datadogNode } from './datadog';
import { pagerdutyNode } from './pagerduty';

// API & Development
import { graphqlNode } from './graphql';

// Browser Automation
import { puppeteerNode } from './puppeteer';

// IoT & Messaging
import { mqttNode } from './mqtt';

// Source Control
import { gitlabNode } from './gitlab';
import { bitbucketNode } from './bitbucket';

import type { NodeDefinition } from '@ws-flows/shared';

export const integrationNodes: NodeDefinition[] = [
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

  // Payments & Finance
  stripeNode,
  paypalNode,
  plaidNode,
  quickbooksNode,
  xeroNode,

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

  // DevOps & Infrastructure
  dockerNode,
  kubernetesNode,
  terraformNode,
  awsLambdaNode,
  gcfNode,
  datadogNode,
  pagerdutyNode,

  // Other
  rssNode,

  // API & Development
  graphqlNode,

  // Browser Automation
  puppeteerNode,

  // IoT & Messaging
  mqttNode,

  // Source Control
  gitlabNode,
  bitbucketNode,
];
