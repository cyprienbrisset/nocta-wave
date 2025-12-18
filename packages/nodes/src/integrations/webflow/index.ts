import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

/**
 * Webflow API v2 Integration Node
 * Base URL: https://api.webflow.com/v2
 * Authentication: Bearer token (Site Token or OAuth)
 *
 * @see https://developers.webflow.com/data/v2.0.0/reference/rest-introduction
 */

const WEBFLOW_API_BASE = 'https://api.webflow.com/v2';

// Schema for Webflow node configuration
export const WebflowSchema = z.object({
  operation: z.enum([
    // Sites
    'listSites',
    'getSite',
    // Collections
    'listCollections',
    'getCollection',
    'createCollection',
    'deleteCollection',
    // Collection Fields
    'createCollectionField',
    'updateCollectionField',
    'deleteCollectionField',
    // Staged Items (Draft)
    'listItems',
    'getItem',
    'createItem',
    'createItemsBulk',
    'updateItem',
    'updateItemsBulk',
    'deleteItem',
    'deleteItemsBulk',
    'publishItems',
    // Live Items (Published)
    'listLiveItems',
    'getLiveItem',
    'createLiveItem',
    'updateLiveItem',
    'updateLiveItemsBulk',
    'unpublishItem',
    'unpublishItemsBulk',
  ]).default('listCollections'),
  // Site parameters
  siteId: z.string().optional(),
  // Collection parameters
  collectionId: z.string().optional(),
  collectionName: z.string().optional(),
  collectionSlug: z.string().optional(),
  collectionSingularName: z.string().optional(),
  // Field parameters
  fieldId: z.string().optional(),
  fieldData: z.record(z.unknown()).optional(),
  // Item parameters
  itemId: z.string().optional(),
  itemIds: z.array(z.string()).optional(),
  fieldData2: z.record(z.unknown()).optional(),
  items: z.array(z.record(z.unknown())).optional(),
  isDraft: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  // Pagination
  offset: z.number().optional(),
  limit: z.number().optional(),
  // Locale
  localeId: z.string().optional(),
});

export type WebflowConfig = z.infer<typeof WebflowSchema>;

/**
 * Build the API endpoint and method based on operation
 */
function buildRequest(config: WebflowConfig): {
  method: string;
  endpoint: string;
  body?: Record<string, unknown>;
  queryParams?: Record<string, string>;
} {
  const { operation, siteId, collectionId, itemId, fieldId } = config;

  // Build query params for pagination and locale
  const queryParams: Record<string, string> = {};
  if (config.offset !== undefined) queryParams.offset = String(config.offset);
  if (config.limit !== undefined) queryParams.limit = String(config.limit);
  if (config.localeId) queryParams.localeId = config.localeId;

  switch (operation) {
    // -------------------------------------------------------------------------
    // Sites
    // -------------------------------------------------------------------------
    case 'listSites':
      return { method: 'GET', endpoint: '/sites', queryParams };

    case 'getSite':
      if (!siteId) throw new Error('Site ID is required');
      return { method: 'GET', endpoint: `/sites/${siteId}`, queryParams };

    // -------------------------------------------------------------------------
    // Collections
    // -------------------------------------------------------------------------
    case 'listCollections':
      if (!siteId) throw new Error('Site ID is required');
      return { method: 'GET', endpoint: `/sites/${siteId}/collections`, queryParams };

    case 'getCollection':
      if (!collectionId) throw new Error('Collection ID is required');
      return { method: 'GET', endpoint: `/collections/${collectionId}`, queryParams };

    case 'createCollection':
      if (!siteId) throw new Error('Site ID is required');
      return {
        method: 'POST',
        endpoint: `/sites/${siteId}/collections`,
        body: {
          displayName: config.collectionName,
          singularName: config.collectionSingularName || config.collectionName,
          slug: config.collectionSlug,
        },
        queryParams,
      };

    case 'deleteCollection':
      if (!collectionId) throw new Error('Collection ID is required');
      return { method: 'DELETE', endpoint: `/collections/${collectionId}`, queryParams };

    // -------------------------------------------------------------------------
    // Collection Fields
    // -------------------------------------------------------------------------
    case 'createCollectionField':
      if (!collectionId) throw new Error('Collection ID is required');
      return {
        method: 'POST',
        endpoint: `/collections/${collectionId}/fields`,
        body: config.fieldData,
        queryParams,
      };

    case 'updateCollectionField':
      if (!collectionId) throw new Error('Collection ID is required');
      if (!fieldId) throw new Error('Field ID is required');
      return {
        method: 'PATCH',
        endpoint: `/collections/${collectionId}/fields/${fieldId}`,
        body: config.fieldData,
        queryParams,
      };

    case 'deleteCollectionField':
      if (!collectionId) throw new Error('Collection ID is required');
      if (!fieldId) throw new Error('Field ID is required');
      return {
        method: 'DELETE',
        endpoint: `/collections/${collectionId}/fields/${fieldId}`,
        queryParams,
      };

    // -------------------------------------------------------------------------
    // Staged Items (Draft)
    // -------------------------------------------------------------------------
    case 'listItems':
      if (!collectionId) throw new Error('Collection ID is required');
      return { method: 'GET', endpoint: `/collections/${collectionId}/items`, queryParams };

    case 'getItem':
      if (!collectionId) throw new Error('Collection ID is required');
      if (!itemId) throw new Error('Item ID is required');
      return { method: 'GET', endpoint: `/collections/${collectionId}/items/${itemId}`, queryParams };

    case 'createItem':
      if (!collectionId) throw new Error('Collection ID is required');
      return {
        method: 'POST',
        endpoint: `/collections/${collectionId}/items`,
        body: {
          fieldData: config.fieldData2,
          isDraft: config.isDraft ?? true,
          isArchived: config.isArchived ?? false,
        },
        queryParams,
      };

    case 'createItemsBulk':
      if (!collectionId) throw new Error('Collection ID is required');
      return {
        method: 'POST',
        endpoint: `/collections/${collectionId}/items/bulk`,
        body: { items: config.items },
        queryParams,
      };

    case 'updateItem':
      if (!collectionId) throw new Error('Collection ID is required');
      if (!itemId) throw new Error('Item ID is required');
      return {
        method: 'PATCH',
        endpoint: `/collections/${collectionId}/items/${itemId}`,
        body: {
          fieldData: config.fieldData2,
          isDraft: config.isDraft,
          isArchived: config.isArchived,
        },
        queryParams,
      };

    case 'updateItemsBulk':
      if (!collectionId) throw new Error('Collection ID is required');
      return {
        method: 'PATCH',
        endpoint: `/collections/${collectionId}/items`,
        body: { items: config.items },
        queryParams,
      };

    case 'deleteItem':
      if (!collectionId) throw new Error('Collection ID is required');
      if (!itemId) throw new Error('Item ID is required');
      return { method: 'DELETE', endpoint: `/collections/${collectionId}/items/${itemId}`, queryParams };

    case 'deleteItemsBulk':
      if (!collectionId) throw new Error('Collection ID is required');
      return {
        method: 'DELETE',
        endpoint: `/collections/${collectionId}/items`,
        body: { itemIds: config.itemIds },
        queryParams,
      };

    case 'publishItems':
      if (!collectionId) throw new Error('Collection ID is required');
      return {
        method: 'POST',
        endpoint: `/collections/${collectionId}/items/publish`,
        body: { itemIds: config.itemIds },
        queryParams,
      };

    // -------------------------------------------------------------------------
    // Live Items (Published)
    // -------------------------------------------------------------------------
    case 'listLiveItems':
      if (!collectionId) throw new Error('Collection ID is required');
      return { method: 'GET', endpoint: `/collections/${collectionId}/items/live`, queryParams };

    case 'getLiveItem':
      if (!collectionId) throw new Error('Collection ID is required');
      if (!itemId) throw new Error('Item ID is required');
      return { method: 'GET', endpoint: `/collections/${collectionId}/items/${itemId}/live`, queryParams };

    case 'createLiveItem':
      if (!collectionId) throw new Error('Collection ID is required');
      return {
        method: 'POST',
        endpoint: `/collections/${collectionId}/items/live`,
        body: {
          fieldData: config.fieldData2,
        },
        queryParams,
      };

    case 'updateLiveItem':
      if (!collectionId) throw new Error('Collection ID is required');
      if (!itemId) throw new Error('Item ID is required');
      return {
        method: 'PATCH',
        endpoint: `/collections/${collectionId}/items/${itemId}/live`,
        body: {
          fieldData: config.fieldData2,
        },
        queryParams,
      };

    case 'updateLiveItemsBulk':
      if (!collectionId) throw new Error('Collection ID is required');
      return {
        method: 'PATCH',
        endpoint: `/collections/${collectionId}/items/live`,
        body: { items: config.items },
        queryParams,
      };

    case 'unpublishItem':
      if (!collectionId) throw new Error('Collection ID is required');
      if (!itemId) throw new Error('Item ID is required');
      return { method: 'DELETE', endpoint: `/collections/${collectionId}/items/${itemId}/live`, queryParams };

    case 'unpublishItemsBulk':
      if (!collectionId) throw new Error('Collection ID is required');
      return {
        method: 'DELETE',
        endpoint: `/collections/${collectionId}/items/live`,
        body: { itemIds: config.itemIds },
        queryParams,
      };

    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

/**
 * Webflow Node Definition
 */
export const webflowNode: NodeDefinition = createNode(
  {
    type: 'integration.webflow',
    category: 'integration',
    name: 'Webflow',
    description: 'Manage Webflow sites, collections, and CMS items via the Data API v2',
    icon: 'Globe',
    inputs: [
      // Operation selector
      input.select('operation', 'Operation', [
        // Sites
        { label: '📍 List Sites', value: 'listSites' },
        { label: '📍 Get Site', value: 'getSite' },
        // Collections
        { label: '📁 List Collections', value: 'listCollections' },
        { label: '📁 Get Collection', value: 'getCollection' },
        { label: '📁 Create Collection', value: 'createCollection' },
        { label: '📁 Delete Collection', value: 'deleteCollection' },
        // Collection Fields
        { label: '🔤 Create Collection Field', value: 'createCollectionField' },
        { label: '🔤 Update Collection Field', value: 'updateCollectionField' },
        { label: '🔤 Delete Collection Field', value: 'deleteCollectionField' },
        // Staged Items
        { label: '📝 List Items (Staged)', value: 'listItems' },
        { label: '📝 Get Item (Staged)', value: 'getItem' },
        { label: '📝 Create Item (Draft)', value: 'createItem' },
        { label: '📝 Create Items Bulk', value: 'createItemsBulk' },
        { label: '📝 Update Item', value: 'updateItem' },
        { label: '📝 Update Items Bulk', value: 'updateItemsBulk' },
        { label: '📝 Delete Item', value: 'deleteItem' },
        { label: '📝 Delete Items Bulk', value: 'deleteItemsBulk' },
        { label: '🚀 Publish Items', value: 'publishItems' },
        // Live Items
        { label: '🌐 List Live Items', value: 'listLiveItems' },
        { label: '🌐 Get Live Item', value: 'getLiveItem' },
        { label: '🌐 Create Live Item', value: 'createLiveItem' },
        { label: '🌐 Update Live Item', value: 'updateLiveItem' },
        { label: '🌐 Update Live Items Bulk', value: 'updateLiveItemsBulk' },
        { label: '🌐 Unpublish Item', value: 'unpublishItem' },
        { label: '🌐 Unpublish Items Bulk', value: 'unpublishItemsBulk' },
      ], {
        default: 'listCollections',
        description: 'Select the Webflow API operation to perform',
      }),

      // Site parameters
      input.string('siteId', 'Site ID', {
        description: 'Webflow Site ID (required for site and collection operations)',
        placeholder: 'e.g., 580e63e98c9a982ac9b8b741',
      }),

      // Collection parameters
      input.string('collectionId', 'Collection ID', {
        description: 'Webflow Collection ID (required for item operations)',
        placeholder: 'e.g., 580e63fc8c9a982ac9b8b745',
      }),
      input.string('collectionName', 'Collection Name', {
        description: 'Display name for the collection (for create)',
        placeholder: 'e.g., Blog Posts',
      }),
      input.string('collectionSlug', 'Collection Slug', {
        description: 'URL slug for the collection (for create)',
        placeholder: 'e.g., blog-posts',
      }),
      input.string('collectionSingularName', 'Singular Name', {
        description: 'Singular name for collection items',
        placeholder: 'e.g., Blog Post',
      }),

      // Field parameters
      input.string('fieldId', 'Field ID', {
        description: 'Collection field ID (for field operations)',
      }),
      input.json('fieldData', 'Field Definition', {
        description: 'Field configuration object for create/update field',
        placeholder: '{"displayName": "Title", "type": "PlainText", "isRequired": true}',
      }),

      // Item parameters
      input.string('itemId', 'Item ID', {
        description: 'Collection item ID (for single item operations)',
      }),
      input.json('itemIds', 'Item IDs', {
        description: 'Array of item IDs (for bulk operations)',
        placeholder: '["id1", "id2", "id3"]',
      }),
      input.json('fieldData2', 'Item Field Data', {
        description: 'Item field data as key-value pairs',
        placeholder: '{"name": "My Post", "slug": "my-post", "content": "..."}',
      }),
      input.json('items', 'Items Array', {
        description: 'Array of items for bulk operations',
        placeholder: '[{"fieldData": {...}}, {"fieldData": {...}}]',
      }),
      input.boolean('isDraft', 'Is Draft', {
        description: 'Whether the item should be created as draft (default: true)',
        default: true,
      }),
      input.boolean('isArchived', 'Is Archived', {
        description: 'Whether the item should be archived',
        default: false,
      }),

      // Pagination
      input.number('offset', 'Offset', {
        description: 'Pagination offset (for list operations)',
        default: 0,
      }),
      input.number('limit', 'Limit', {
        description: 'Maximum items to return (for list operations)',
        default: 100,
      }),

      // Locale
      input.string('localeId', 'Locale ID', {
        description: 'Locale identifier for localized content',
        placeholder: 'e.g., 653fd9af6a07fc9cfd7a5e57',
      }),
    ],
    outputs: [
      output.object('result', 'API response data'),
      output.array('items', 'Collection items (for list operations)'),
      output.object('site', 'Site information'),
      output.object('collection', 'Collection information'),
      output.object('item', 'Single item data'),
      output.number('count', 'Total count of items'),
    ],
    credentials: ['api_key'],
  },
  async (nodeInput, context) => {
    const config = WebflowSchema.parse(nodeInput.config);
    const apiKey = nodeInput.credentials?.api_key as string | undefined;

    if (!apiKey) {
      throw new Error('Webflow API key is required. Add a credential with type "api_key".');
    }

    context.logger.info(`Webflow: Executing ${config.operation}`);

    // Build request parameters
    const { method, endpoint, body, queryParams } = buildRequest(config);

    // Build full URL with query params
    let url = `${WEBFLOW_API_BASE}${endpoint}`;
    if (queryParams && Object.keys(queryParams).length > 0) {
      const params = new URLSearchParams(queryParams);
      url += `?${params.toString()}`;
    }

    context.logger.debug(`Webflow: ${method} ${url}`);

    // Make the API request
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'accept-version': '2.0.0',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = (errorData as { message?: string })?.message || response.statusText;
      throw new Error(`Webflow API error (${response.status}): ${errorMessage}`);
    }

    // Handle empty responses (DELETE operations)
    if (response.status === 204) {
      context.logger.info('Webflow: Operation completed successfully (no content)');
      return {
        data: {
          result: { success: true },
          items: [],
          site: {},
          collection: {},
          item: {},
          count: 0,
        }
      };
    }

    const data = await response.json();

    // Parse response based on operation type
    const result: Record<string, unknown> = {
      result: data,
      items: [],
      site: {},
      collection: {},
      item: {},
      count: 0,
    };

    // Map response to appropriate output fields
    if (config.operation === 'listSites') {
      result.items = (data as { sites?: unknown[] }).sites || [];
      result.count = ((data as { sites?: unknown[] }).sites || []).length;
    } else if (config.operation === 'getSite') {
      result.site = data;
    } else if (config.operation === 'listCollections') {
      result.items = (data as { collections?: unknown[] }).collections || [];
      result.count = ((data as { collections?: unknown[] }).collections || []).length;
    } else if (config.operation === 'getCollection' || config.operation === 'createCollection') {
      result.collection = data;
    } else if (config.operation.includes('listItems') || config.operation.includes('listLiveItems')) {
      result.items = (data as { items?: unknown[] }).items || [];
      result.count = (data as { pagination?: { total?: number } }).pagination?.total || ((data as { items?: unknown[] }).items || []).length;
    } else if (config.operation.includes('Item') && !config.operation.includes('Items')) {
      result.item = data;
    } else if (config.operation.includes('Items')) {
      result.items = (data as { items?: unknown[] }).items || [data];
      result.count = ((data as { items?: unknown[] }).items || [data]).length;
    }

    context.logger.info(`Webflow: ${config.operation} completed successfully`);

    // Mark that this needs actual execution in worker
    return {
      data: {
        ...result,
        __needsExecution: true
      }
    };
  }
);
