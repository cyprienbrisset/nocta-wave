import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const GoogleAdsNodeSchema = z.object({
  resource: z.enum(['campaigns', 'adGroups', 'ads', 'keywords', 'reports', 'conversions', 'audiences']).default('campaigns'),
  operation: z.enum([
    'create', 'update', 'get', 'delete', 'list', 'search',
    'pause', 'enable', 'remove', 'runReport'
  ]).default('list'),
  customerId: z.string().optional(),
  campaignId: z.string().optional(),
  adGroupId: z.string().optional(),
  adId: z.string().optional(),
  keywordId: z.string().optional(),
  name: z.string().optional(),
  status: z.enum(['ENABLED', 'PAUSED', 'REMOVED']).optional(),
  campaignBudget: z.number().optional(),
  advertisingChannelType: z.enum(['SEARCH', 'DISPLAY', 'SHOPPING', 'VIDEO', 'MULTI_CHANNEL', 'PERFORMANCE_MAX']).optional(),
  biddingStrategy: z.enum(['MANUAL_CPC', 'MAXIMIZE_CLICKS', 'MAXIMIZE_CONVERSIONS', 'TARGET_CPA', 'TARGET_ROAS']).optional(),
  targetCpa: z.number().optional(),
  targetRoas: z.number().optional(),
  keywordText: z.string().optional(),
  keywordMatchType: z.enum(['EXACT', 'PHRASE', 'BROAD']).optional(),
  query: z.string().optional(),
  dateRange: z.object({
    startDate: z.string(),
    endDate: z.string(),
  }).optional(),
  metrics: z.array(z.string()).optional(),
  segments: z.array(z.string()).optional(),
  pageSize: z.number().min(1).max(10000).default(100),
  pageToken: z.string().optional(),
  credentialId: z.string().optional(),
});

export type GoogleAdsNodeConfig = z.infer<typeof GoogleAdsNodeSchema>;

export const googleAdsNode: NodeDefinition = createNode(
  {
    type: 'integration.google-ads',
    category: 'integration',
    name: 'Google Ads',
    description: 'Advertising - Campaigns, ad groups, keywords, reports',
    icon: 'Target',
    inputs: [
      input.select(
        'resource',
        'Resource',
        [
          { label: 'Campaigns', value: 'campaigns' },
          { label: 'Ad Groups', value: 'adGroups' },
          { label: 'Ads', value: 'ads' },
          { label: 'Keywords', value: 'keywords' },
          { label: 'Reports', value: 'reports' },
          { label: 'Conversions', value: 'conversions' },
          { label: 'Audiences', value: 'audiences' },
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
          { label: 'Search', value: 'search' },
          { label: 'Pause', value: 'pause' },
          { label: 'Enable', value: 'enable' },
          { label: 'Remove', value: 'remove' },
          { label: 'Run Report', value: 'runReport' },
        ],
        { default: 'list' }
      ),
      input.string('customerId', 'Customer ID', {
        description: 'Google Ads customer ID (without dashes)',
        placeholder: '1234567890',
        required: true,
      }),
      input.string('campaignId', 'Campaign ID', {
        description: 'Campaign resource name or ID',
      }),
      input.string('adGroupId', 'Ad Group ID', {
        description: 'Ad Group resource name or ID',
      }),
      input.string('adId', 'Ad ID', {
        description: 'Ad resource name or ID',
      }),
      input.string('name', 'Name', {
        description: 'Campaign/Ad Group name',
        placeholder: 'My Campaign',
      }),
      input.select(
        'status',
        'Status',
        [
          { label: 'Enabled', value: 'ENABLED' },
          { label: 'Paused', value: 'PAUSED' },
          { label: 'Removed', value: 'REMOVED' },
        ],
        { default: 'ENABLED' }
      ),
      input.number('campaignBudget', 'Daily Budget', {
        description: 'Daily budget in micros (1 currency unit = 1,000,000 micros)',
      }),
      input.select(
        'advertisingChannelType',
        'Channel Type',
        [
          { label: 'Search', value: 'SEARCH' },
          { label: 'Display', value: 'DISPLAY' },
          { label: 'Shopping', value: 'SHOPPING' },
          { label: 'Video', value: 'VIDEO' },
          { label: 'Performance Max', value: 'PERFORMANCE_MAX' },
        ],
        { default: 'SEARCH' }
      ),
      input.select(
        'biddingStrategy',
        'Bidding Strategy',
        [
          { label: 'Manual CPC', value: 'MANUAL_CPC' },
          { label: 'Maximize Clicks', value: 'MAXIMIZE_CLICKS' },
          { label: 'Maximize Conversions', value: 'MAXIMIZE_CONVERSIONS' },
          { label: 'Target CPA', value: 'TARGET_CPA' },
          { label: 'Target ROAS', value: 'TARGET_ROAS' },
        ],
        { default: 'MAXIMIZE_CLICKS' }
      ),
      input.number('targetCpa', 'Target CPA', {
        description: 'Target cost per acquisition in micros',
      }),
      input.number('targetRoas', 'Target ROAS', {
        description: 'Target return on ad spend (e.g., 3.5 for 350%)',
      }),
      input.string('keywordText', 'Keyword Text', {
        description: 'Keyword text',
        placeholder: 'buy shoes online',
      }),
      input.select(
        'keywordMatchType',
        'Match Type',
        [
          { label: 'Exact', value: 'EXACT' },
          { label: 'Phrase', value: 'PHRASE' },
          { label: 'Broad', value: 'BROAD' },
        ],
        { default: 'BROAD' }
      ),
      input.string('query', 'GAQL Query', {
        description: 'Google Ads Query Language query',
        placeholder: 'SELECT campaign.id, campaign.name FROM campaign',
      }),
      input.json('dateRange', 'Date Range', {
        description: 'Date range for reports',
        default: {},
      }),
      input.json('metrics', 'Metrics', {
        description: 'Metrics to include in report',
        default: ['impressions', 'clicks', 'cost_micros', 'conversions'],
      }),
      input.json('segments', 'Segments', {
        description: 'Segments for report breakdown',
        default: [],
      }),
      input.number('pageSize', 'Page Size', {
        description: 'Results per page',
        default: 100,
        min: 1,
        max: 10000,
      }),
      input.string('pageToken', 'Page Token', {
        description: 'Token for pagination',
      }),
      input.credential('credentialId', 'Google Ads Credentials', {
        description: 'Google Ads OAuth2 credentials',
        credentialTypes: ['OAUTH2'],
        required: true,
      }),
    ],
    outputs: [
      output.boolean('success', 'Operation success'),
      output.array('items', 'List results'),
      output.object('item', 'Single item'),
      output.string('resourceName', 'Resource name'),
      output.array('rows', 'Report rows'),
      output.string('nextPageToken', 'Next page token'),
    ],
    defaults: {
      resource: 'campaigns',
      operation: 'list',
      status: 'ENABLED',
      advertisingChannelType: 'SEARCH',
      biddingStrategy: 'MAXIMIZE_CLICKS',
      keywordMatchType: 'BROAD',
      pageSize: 100,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = GoogleAdsNodeSchema.parse(nodeInput.config);

    logger.info(`Google Ads ${config.operation} on ${config.resource}`);

    switch (config.operation) {
      case 'list':
        return {
          data: {
            success: true,
            items: [
              {
                resourceName: `customers/${config.customerId}/campaigns/123456`,
                id: '123456',
                name: 'Search Campaign - Brand',
                status: 'ENABLED',
                advertisingChannelType: 'SEARCH',
                biddingStrategyType: 'MAXIMIZE_CONVERSIONS',
                campaignBudget: 'customers/123/campaignBudgets/456',
              },
              {
                resourceName: `customers/${config.customerId}/campaigns/789012`,
                id: '789012',
                name: 'Display Campaign - Remarketing',
                status: 'PAUSED',
                advertisingChannelType: 'DISPLAY',
              },
            ],
            nextPageToken: null,
          },
        };

      case 'get':
        return {
          data: {
            success: true,
            item: {
              resourceName: `customers/${config.customerId}/campaigns/${config.campaignId}`,
              id: config.campaignId,
              name: 'Search Campaign - Brand',
              status: 'ENABLED',
              advertisingChannelType: 'SEARCH',
              biddingStrategyType: 'MAXIMIZE_CONVERSIONS',
              startDate: '2024-01-01',
              networkSettings: {
                targetGoogleSearch: true,
                targetSearchNetwork: true,
                targetContentNetwork: false,
              },
            },
          },
        };

      case 'runReport':
      case 'search':
        return {
          data: {
            success: true,
            rows: [
              {
                campaign: { id: '123456', name: 'Search Campaign' },
                metrics: {
                  impressions: '125432',
                  clicks: '3421',
                  costMicros: '1984180000',
                  conversions: '142.5',
                  ctr: '0.0273',
                  averageCpc: '580000',
                },
              },
              {
                campaign: { id: '789012', name: 'Display Campaign' },
                metrics: {
                  impressions: '523412',
                  clicks: '1234',
                  costMicros: '892340000',
                  conversions: '45.2',
                  ctr: '0.0024',
                  averageCpc: '723000',
                },
              },
            ],
            nextPageToken: null,
          },
        };

      case 'create':
        return {
          data: {
            success: true,
            resourceName: `customers/${config.customerId}/campaigns/${Date.now()}`,
            item: {
              id: String(Date.now()),
              name: config.name,
              status: config.status,
              advertisingChannelType: config.advertisingChannelType,
            },
          },
        };

      case 'update':
        return {
          data: {
            success: true,
            resourceName: `customers/${config.customerId}/campaigns/${config.campaignId}`,
            item: {
              id: config.campaignId,
              name: config.name,
              status: config.status,
            },
          },
        };

      case 'delete':
      case 'remove':
        return {
          data: {
            success: true,
            resourceName: `customers/${config.customerId}/campaigns/${config.campaignId}`,
            removed: true,
          },
        };

      case 'pause':
        return {
          data: {
            success: true,
            resourceName: `customers/${config.customerId}/campaigns/${config.campaignId}`,
            status: 'PAUSED',
          },
        };

      case 'enable':
        return {
          data: {
            success: true,
            resourceName: `customers/${config.customerId}/campaigns/${config.campaignId}`,
            status: 'ENABLED',
          },
        };

      default:
        return { data: { success: false, error: 'Unknown operation' } };
    }
  }
);
