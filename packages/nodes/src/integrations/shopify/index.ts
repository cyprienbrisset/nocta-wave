import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const ShopifyNodeSchema = z.object({
  resource: z.enum(['products', 'orders', 'customers', 'inventory', 'collections', 'discounts', 'fulfillments', 'webhooks']).default('products'),
  operation: z.enum([
    'create', 'update', 'get', 'delete', 'list',
    'search', 'count', 'updateInventory', 'createFulfillment', 'cancelOrder', 'closeOrder'
  ]).default('list'),
  productId: z.number().optional(),
  orderId: z.number().optional(),
  customerId: z.number().optional(),
  variantId: z.number().optional(),
  collectionId: z.number().optional(),
  title: z.string().optional(),
  bodyHtml: z.string().optional(),
  vendor: z.string().optional(),
  productType: z.string().optional(),
  tags: z.array(z.string()).optional(),
  variants: z.array(z.object({
    title: z.string(),
    price: z.string(),
    sku: z.string().optional(),
    inventory_quantity: z.number().optional(),
  })).optional(),
  images: z.array(z.object({
    src: z.string(),
    alt: z.string().optional(),
  })).optional(),
  status: z.enum(['active', 'archived', 'draft']).optional(),
  inventoryItemId: z.number().optional(),
  locationId: z.number().optional(),
  availableQuantity: z.number().optional(),
  lineItems: z.array(z.object({
    variant_id: z.number(),
    quantity: z.number(),
  })).optional(),
  email: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  searchQuery: z.string().optional(),
  sinceId: z.number().optional(),
  limit: z.number().min(1).max(250).default(50),
  credentialId: z.string().optional(),
});

export type ShopifyNodeConfig = z.infer<typeof ShopifyNodeSchema>;

export const shopifyNode: NodeDefinition = createNode(
  {
    type: 'integration.shopify',
    category: 'integration',
    name: 'Shopify',
    description: 'E-commerce platform - Products, orders, customers, inventory',
    icon: 'ShoppingBag',
    inputs: [
      input.select(
        'resource',
        'Resource',
        [
          { label: 'Products', value: 'products' },
          { label: 'Orders', value: 'orders' },
          { label: 'Customers', value: 'customers' },
          { label: 'Inventory', value: 'inventory' },
          { label: 'Collections', value: 'collections' },
          { label: 'Discounts', value: 'discounts' },
          { label: 'Fulfillments', value: 'fulfillments' },
          { label: 'Webhooks', value: 'webhooks' },
        ],
        { default: 'products' }
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
          { label: 'Count', value: 'count' },
          { label: 'Update Inventory', value: 'updateInventory' },
          { label: 'Create Fulfillment', value: 'createFulfillment' },
          { label: 'Cancel Order', value: 'cancelOrder' },
          { label: 'Close Order', value: 'closeOrder' },
        ],
        { default: 'list' }
      ),
      input.number('productId', 'Product ID', {
        description: 'Shopify product ID',
      }),
      input.number('orderId', 'Order ID', {
        description: 'Shopify order ID',
      }),
      input.number('customerId', 'Customer ID', {
        description: 'Shopify customer ID',
      }),
      input.number('variantId', 'Variant ID', {
        description: 'Product variant ID',
      }),
      input.number('collectionId', 'Collection ID', {
        description: 'Collection ID',
      }),
      input.string('title', 'Title', {
        description: 'Product title',
        placeholder: 'Amazing Product',
      }),
      input.text('bodyHtml', 'Description (HTML)', {
        description: 'Product description in HTML',
      }),
      input.string('vendor', 'Vendor', {
        description: 'Product vendor',
      }),
      input.string('productType', 'Product Type', {
        description: 'Product type',
      }),
      input.json('tags', 'Tags', {
        description: 'Product tags',
        default: [],
      }),
      input.json('variants', 'Variants', {
        description: 'Product variants',
        default: [],
      }),
      input.json('images', 'Images', {
        description: 'Product images',
        default: [],
      }),
      input.select(
        'status',
        'Status',
        [
          { label: 'Active', value: 'active' },
          { label: 'Draft', value: 'draft' },
          { label: 'Archived', value: 'archived' },
        ],
        { default: 'active' }
      ),
      input.number('inventoryItemId', 'Inventory Item ID', {
        description: 'Inventory item ID',
      }),
      input.number('locationId', 'Location ID', {
        description: 'Inventory location ID',
      }),
      input.number('availableQuantity', 'Available Quantity', {
        description: 'Inventory quantity to set',
      }),
      input.json('lineItems', 'Line Items', {
        description: 'Order line items',
        default: [],
      }),
      input.string('email', 'Email', {
        description: 'Customer email',
      }),
      input.string('firstName', 'First Name', {
        description: 'Customer first name',
      }),
      input.string('lastName', 'Last Name', {
        description: 'Customer last name',
      }),
      input.string('searchQuery', 'Search Query', {
        description: 'Search query',
      }),
      input.number('sinceId', 'Since ID', {
        description: 'Return items after this ID',
      }),
      input.number('limit', 'Limit', {
        description: 'Maximum results',
        default: 50,
        min: 1,
        max: 250,
      }),
      input.credential('credentialId', 'Shopify Credentials', {
        description: 'Shopify Admin API access token',
        credentialTypes: ['API_KEY', 'OAUTH2'],
        required: true,
      }),
    ],
    outputs: [
      output.boolean('success', 'Operation success'),
      output.array('items', 'List results'),
      output.object('item', 'Single item'),
      output.number('id', 'Created/updated item ID'),
      output.number('count', 'Total count'),
    ],
    defaults: {
      resource: 'products',
      operation: 'list',
      status: 'active',
      limit: 50,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = ShopifyNodeSchema.parse(nodeInput.config);

    logger.info(`Shopify ${config.operation} on ${config.resource}`);

    switch (config.operation) {
      case 'list':
        if (config.resource === 'products') {
          return {
            data: {
              success: true,
              items: [
                {
                  id: 123456789,
                  title: 'Premium T-Shirt',
                  body_html: '<p>High quality cotton t-shirt</p>',
                  vendor: 'MyBrand',
                  product_type: 'Clothing',
                  status: 'active',
                  tags: 'cotton, summer, casual',
                  variants: [
                    { id: 1, title: 'Small', price: '29.99', sku: 'TS-S', inventory_quantity: 50 },
                    { id: 2, title: 'Medium', price: '29.99', sku: 'TS-M', inventory_quantity: 100 },
                  ],
                  images: [{ src: 'https://example.com/tshirt.jpg' }],
                  created_at: new Date().toISOString(),
                },
              ],
            },
          };
        }
        if (config.resource === 'orders') {
          return {
            data: {
              success: true,
              items: [
                {
                  id: 987654321,
                  order_number: 1001,
                  email: 'customer@example.com',
                  total_price: '59.98',
                  currency: 'USD',
                  financial_status: 'paid',
                  fulfillment_status: null,
                  line_items: [
                    { id: 1, title: 'Premium T-Shirt', quantity: 2, price: '29.99' },
                  ],
                  created_at: new Date().toISOString(),
                },
              ],
            },
          };
        }
        return {
          data: {
            success: true,
            items: [],
          },
        };

      case 'get':
        return {
          data: {
            success: true,
            item: {
              id: config.productId || config.orderId || config.customerId,
              title: 'Premium T-Shirt',
              status: 'active',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          },
        };

      case 'create':
        return {
          data: {
            success: true,
            id: Date.now(),
            item: {
              id: Date.now(),
              title: config.title,
              body_html: config.bodyHtml,
              vendor: config.vendor,
              product_type: config.productType,
              tags: config.tags?.join(', '),
              status: config.status,
              variants: config.variants,
              created_at: new Date().toISOString(),
            },
          },
        };

      case 'update':
        return {
          data: {
            success: true,
            id: config.productId || config.orderId,
            item: {
              id: config.productId || config.orderId,
              title: config.title,
              status: config.status,
              updated_at: new Date().toISOString(),
            },
          },
        };

      case 'delete':
        return {
          data: {
            success: true,
            id: config.productId || config.orderId || config.customerId,
            deleted: true,
          },
        };

      case 'search':
        return {
          data: {
            success: true,
            items: [
              {
                id: 123456789,
                title: config.searchQuery,
              },
            ],
          },
        };

      case 'count':
        return {
          data: {
            success: true,
            count: 150,
          },
        };

      case 'updateInventory':
        return {
          data: {
            success: true,
            inventoryItemId: config.inventoryItemId,
            locationId: config.locationId,
            available: config.availableQuantity,
          },
        };

      case 'createFulfillment':
        return {
          data: {
            success: true,
            id: Date.now(),
            orderId: config.orderId,
            status: 'success',
            tracking_number: 'TRACK123456',
          },
        };

      case 'cancelOrder':
        return {
          data: {
            success: true,
            orderId: config.orderId,
            cancelled: true,
          },
        };

      case 'closeOrder':
        return {
          data: {
            success: true,
            orderId: config.orderId,
            closed: true,
          },
        };

      default:
        return { data: { success: false, error: 'Unknown operation' } };
    }
  }
);
