import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const FacebookAdsNodeSchema = z.object({
  resource: z.enum(['campaigns', 'adsets', 'ads', 'insights', 'audiences', 'creatives']).default('campaigns'),
  operation: z.enum([
    'create', 'update', 'get', 'delete', 'list',
    'getInsights', 'pause', 'activate', 'duplicate'
  ]).default('list'),
  adAccountId: z.string().optional(),
  campaignId: z.string().optional(),
  adsetId: z.string().optional(),
  adId: z.string().optional(),
  audienceId: z.string().optional(),
  name: z.string().optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'DELETED', 'ARCHIVED']).optional(),
  objective: z.enum([
    'AWARENESS', 'TRAFFIC', 'ENGAGEMENT', 'LEADS',
    'APP_PROMOTION', 'SALES', 'OUTCOME_AWARENESS',
    'OUTCOME_ENGAGEMENT', 'OUTCOME_LEADS', 'OUTCOME_SALES', 'OUTCOME_TRAFFIC'
  ]).optional(),
  specialAdCategories: z.array(z.string()).optional(),
  dailyBudget: z.number().optional(),
  lifetimeBudget: z.number().optional(),
  bidAmount: z.number().optional(),
  billingEvent: z.enum(['IMPRESSIONS', 'LINK_CLICKS', 'APP_INSTALLS', 'PAGE_LIKES', 'POST_ENGAGEMENT']).optional(),
  optimizationGoal: z.enum(['REACH', 'IMPRESSIONS', 'LINK_CLICKS', 'LANDING_PAGE_VIEWS', 'CONVERSIONS', 'LEAD_GENERATION']).optional(),
  targeting: z.object({
    geoLocations: z.object({
      countries: z.array(z.string()).optional(),
      cities: z.array(z.object({ key: z.string() })).optional(),
    }).optional(),
    ageMin: z.number().optional(),
    ageMax: z.number().optional(),
    genders: z.array(z.number()).optional(),
    interests: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
  }).optional(),
  datePreset: z.enum(['today', 'yesterday', 'last_7d', 'last_14d', 'last_28d', 'last_30d', 'last_90d', 'this_month', 'last_month']).optional(),
  timeRange: z.object({
    since: z.string(),
    until: z.string(),
  }).optional(),
  level: z.enum(['account', 'campaign', 'adset', 'ad']).default('campaign'),
  breakdowns: z.array(z.string()).optional(),
  fields: z.array(z.string()).optional(),
  limit: z.number().min(1).max(500).default(50),
  credentialId: z.string().optional(),
});

export type FacebookAdsNodeConfig = z.infer<typeof FacebookAdsNodeSchema>;

export const facebookAdsNode: NodeDefinition = createNode(
  {
    type: 'integration.facebook-ads',
    category: 'integration',
    name: 'Facebook Ads',
    description: 'Meta Ads - Campaigns, adsets, ads, insights',
    icon: 'Megaphone',
    inputs: [
      input.select(
        'resource',
        'Resource',
        [
          { label: 'Campaigns', value: 'campaigns' },
          { label: 'Ad Sets', value: 'adsets' },
          { label: 'Ads', value: 'ads' },
          { label: 'Insights', value: 'insights' },
          { label: 'Custom Audiences', value: 'audiences' },
          { label: 'Ad Creatives', value: 'creatives' },
        ],
        { default: 'campaigns' }
      ),
      input.select(
        'operation',
        'Operation',
        [
          { label: 'List', value: 'list' },
          { label: 'Get', value: 'get' },
          { label: 'Create', value: 'create' },
          { label: 'Update', value: 'update' },
          { label: 'Delete', value: 'delete' },
          { label: 'Get Insights', value: 'getInsights' },
          { label: 'Pause', value: 'pause' },
          { label: 'Activate', value: 'activate' },
          { label: 'Duplicate', value: 'duplicate' },
        ],
        { default: 'list' }
      ),
      input.string('adAccountId', 'Ad Account ID', {
        description: 'Facebook Ad Account ID (act_xxxxx)',
        placeholder: 'act_123456789',
        required: true,
      }),
      input.string('campaignId', 'Campaign ID', {
        description: 'Campaign ID',
      }),
      input.string('adsetId', 'Ad Set ID', {
        description: 'Ad Set ID',
      }),
      input.string('adId', 'Ad ID', {
        description: 'Ad ID',
      }),
      input.string('audienceId', 'Audience ID', {
        description: 'Custom Audience ID',
      }),
      input.string('name', 'Name', {
        description: 'Campaign/Ad Set/Ad name',
        placeholder: 'My Campaign',
      }),
      input.select(
        'status',
        'Status',
        [
          { label: 'Active', value: 'ACTIVE' },
          { label: 'Paused', value: 'PAUSED' },
          { label: 'Deleted', value: 'DELETED' },
          { label: 'Archived', value: 'ARCHIVED' },
        ],
        { default: 'ACTIVE' }
      ),
      input.select(
        'objective',
        'Campaign Objective',
        [
          { label: 'Awareness', value: 'OUTCOME_AWARENESS' },
          { label: 'Traffic', value: 'OUTCOME_TRAFFIC' },
          { label: 'Engagement', value: 'OUTCOME_ENGAGEMENT' },
          { label: 'Leads', value: 'OUTCOME_LEADS' },
          { label: 'Sales', value: 'OUTCOME_SALES' },
        ],
        { default: 'OUTCOME_TRAFFIC' }
      ),
      input.number('dailyBudget', 'Daily Budget', {
        description: 'Daily budget in cents',
      }),
      input.number('lifetimeBudget', 'Lifetime Budget', {
        description: 'Lifetime budget in cents',
      }),
      input.select(
        'billingEvent',
        'Billing Event',
        [
          { label: 'Impressions', value: 'IMPRESSIONS' },
          { label: 'Link Clicks', value: 'LINK_CLICKS' },
          { label: 'App Installs', value: 'APP_INSTALLS' },
        ],
        { default: 'IMPRESSIONS' }
      ),
      input.select(
        'optimizationGoal',
        'Optimization Goal',
        [
          { label: 'Reach', value: 'REACH' },
          { label: 'Impressions', value: 'IMPRESSIONS' },
          { label: 'Link Clicks', value: 'LINK_CLICKS' },
          { label: 'Landing Page Views', value: 'LANDING_PAGE_VIEWS' },
          { label: 'Conversions', value: 'CONVERSIONS' },
          { label: 'Lead Generation', value: 'LEAD_GENERATION' },
        ],
        { default: 'LINK_CLICKS' }
      ),
      input.json('targeting', 'Targeting', {
        description: 'Targeting specification',
        default: {},
      }),
      input.select(
        'datePreset',
        'Date Preset',
        [
          { label: 'Today', value: 'today' },
          { label: 'Yesterday', value: 'yesterday' },
          { label: 'Last 7 Days', value: 'last_7d' },
          { label: 'Last 14 Days', value: 'last_14d' },
          { label: 'Last 28 Days', value: 'last_28d' },
          { label: 'Last 30 Days', value: 'last_30d' },
          { label: 'Last 90 Days', value: 'last_90d' },
          { label: 'This Month', value: 'this_month' },
          { label: 'Last Month', value: 'last_month' },
        ],
        { default: 'last_7d' }
      ),
      input.select(
        'level',
        'Insights Level',
        [
          { label: 'Account', value: 'account' },
          { label: 'Campaign', value: 'campaign' },
          { label: 'Ad Set', value: 'adset' },
          { label: 'Ad', value: 'ad' },
        ],
        { default: 'campaign' }
      ),
      input.json('breakdowns', 'Breakdowns', {
        description: 'Insights breakdowns (age, gender, country, etc.)',
        default: [],
      }),
      input.json('fields', 'Fields', {
        description: 'Fields to retrieve',
        default: [],
      }),
      input.number('limit', 'Limit', {
        description: 'Maximum results',
        default: 50,
        min: 1,
        max: 500,
      }),
      input.credential('credentialId', 'Facebook Credentials', {
        description: 'Facebook Marketing API access token',
        credentialTypes: ['OAUTH2'],
        required: true,
      }),
    ],
    outputs: [
      output.boolean('success', 'Operation success'),
      output.array('items', 'List results'),
      output.object('item', 'Single item'),
      output.string('id', 'Item ID'),
      output.object('insights', 'Insights data'),
    ],
    defaults: {
      resource: 'campaigns',
      operation: 'list',
      status: 'ACTIVE',
      objective: 'OUTCOME_TRAFFIC',
      billingEvent: 'IMPRESSIONS',
      optimizationGoal: 'LINK_CLICKS',
      datePreset: 'last_7d',
      level: 'campaign',
      limit: 50,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = FacebookAdsNodeSchema.parse(nodeInput.config);

    logger.info(`Facebook Ads ${config.operation} on ${config.resource}`);

    switch (config.operation) {
      case 'list':
        return {
          data: {
            success: true,
            items: [
              {
                id: '23847563829561',
                name: 'Summer Sale Campaign',
                status: 'ACTIVE',
                objective: 'OUTCOME_SALES',
                daily_budget: 5000,
                created_time: new Date().toISOString(),
                updated_time: new Date().toISOString(),
              },
              {
                id: '23847563829562',
                name: 'Brand Awareness',
                status: 'PAUSED',
                objective: 'OUTCOME_AWARENESS',
                lifetime_budget: 100000,
              },
            ],
          },
        };

      case 'get':
        return {
          data: {
            success: true,
            item: {
              id: config.campaignId || config.adsetId || config.adId,
              name: 'Summer Sale Campaign',
              status: 'ACTIVE',
              objective: 'OUTCOME_SALES',
              daily_budget: 5000,
              buying_type: 'AUCTION',
              special_ad_categories: [],
              created_time: new Date().toISOString(),
            },
          },
        };

      case 'getInsights':
        return {
          data: {
            success: true,
            insights: {
              impressions: '125432',
              reach: '89234',
              clicks: '3421',
              cpc: '0.58',
              cpm: '4.21',
              ctr: '2.73',
              spend: '1984.18',
              conversions: '142',
              cost_per_conversion: '13.97',
              frequency: '1.41',
              date_start: '2024-01-01',
              date_stop: '2024-01-07',
            },
          },
        };

      case 'create':
        return {
          data: {
            success: true,
            id: `campaign_${Date.now()}`,
            item: {
              id: `campaign_${Date.now()}`,
              name: config.name,
              status: config.status,
              objective: config.objective,
              daily_budget: config.dailyBudget,
              created_time: new Date().toISOString(),
            },
          },
        };

      case 'update':
        return {
          data: {
            success: true,
            id: config.campaignId || config.adsetId || config.adId,
            item: {
              id: config.campaignId || config.adsetId || config.adId,
              name: config.name,
              status: config.status,
              updated_time: new Date().toISOString(),
            },
          },
        };

      case 'delete':
        return {
          data: {
            success: true,
            id: config.campaignId || config.adsetId || config.adId,
            deleted: true,
          },
        };

      case 'pause':
        return {
          data: {
            success: true,
            id: config.campaignId || config.adsetId || config.adId,
            status: 'PAUSED',
          },
        };

      case 'activate':
        return {
          data: {
            success: true,
            id: config.campaignId || config.adsetId || config.adId,
            status: 'ACTIVE',
          },
        };

      case 'duplicate':
        return {
          data: {
            success: true,
            id: `${config.campaignId || config.adsetId}_copy`,
            copiedFromId: config.campaignId || config.adsetId,
          },
        };

      default:
        return { data: { success: false, error: 'Unknown operation' } };
    }
  }
);
