import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const MagentoNodeSchema = z.object({
  resource: z.enum(['products', 'orders', 'customers', 'categories', 'inventory', 'carts', 'invoices', 'shipments']).default('products'),
  operation: z.enum([
    'create', 'update', 'get', 'delete', 'list', 'search',
    'updateStock', 'addToCart', 'createInvoice', 'createShipment'
  ]).default('list'),
  sku: z.string().optional(),
  orderId: z.number().optional(),
  customerId: z.number().optional(),
  categoryId: z.number().optional(),
  cartId: z.string().optional(),
  name: z.string().optional(),
  price: z.number().optional(),
  typeId: z.enum(['simple', 'configurable', 'virtual', 'bundle', 'downloadable', 'grouped']).default('simple'),
  status: z.number().min(0).max(2).default(1),
  visibility: z.number().min(1).max(4).default(4),
  weight: z.number().optional(),
  attributeSetId: z.number().optional(),
  customAttributes: z.array(z.object({
    attribute_code: z.string(),
    value: z.unknown(),
  })).optional(),
  stockData: z.object({
    qty: z.number(),
    is_in_stock: z.boolean(),
  }).optional(),
  searchCriteria: z.object({
    filterGroups: z.array(z.object({
      filters: z.array(z.object({
        field: z.string(),
        value: z.string(),
        conditionType: z.string(),
      })),
    })).optional(),
    sortOrders: z.array(z.object({
      field: z.string(),
      direction: z.string(),
    })).optional(),
    pageSize: z.number().optional(),
    currentPage: z.number().optional(),
  }).optional(),
  pageSize: z.number().min(1).max(100).default(20),
  currentPage: z.number().min(1).default(1),
  credentialId: z.string().optional(),
});

export type MagentoNodeConfig = z.infer<typeof MagentoNodeSchema>;

export const magentoNode: NodeDefinition = createNode(
  {
    type: 'integration.magento',
    category: 'integration',
    name: 'Magento',
    description: 'Adobe Commerce - Products, orders, customers, inventory',
    icon: 'Package',
    inputs: [
      input.select(
        'resource',
        'Resource',
        [
          { label: 'Products', value: 'products' },
          { label: 'Orders', value: 'orders' },
          { label: 'Customers', value: 'customers' },
          { label: 'Categories', value: 'categories' },
          { label: 'Inventory', value: 'inventory' },
          { label: 'Carts', value: 'carts' },
          { label: 'Invoices', value: 'invoices' },
          { label: 'Shipments', value: 'shipments' },
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
          { label: 'Update Stock', value: 'updateStock' },
          { label: 'Add to Cart', value: 'addToCart' },
          { label: 'Create Invoice', value: 'createInvoice' },
          { label: 'Create Shipment', value: 'createShipment' },
        ],
        { default: 'list' }
      ),
      input.string('sku', 'SKU', {
        description: 'Product SKU',
        placeholder: 'PROD-001',
      }),
      input.number('orderId', 'Order ID', {
        description: 'Magento order entity ID',
      }),
      input.number('customerId', 'Customer ID', {
        description: 'Customer entity ID',
      }),
      input.number('categoryId', 'Category ID', {
        description: 'Category ID',
      }),
      input.string('cartId', 'Cart ID', {
        description: 'Quote/cart ID',
      }),
      input.string('name', 'Name', {
        description: 'Product name',
        placeholder: 'Product Name',
      }),
      input.number('price', 'Price', {
        description: 'Product price',
      }),
      input.select(
        'typeId',
        'Product Type',
        [
          { label: 'Simple', value: 'simple' },
          { label: 'Configurable', value: 'configurable' },
          { label: 'Virtual', value: 'virtual' },
          { label: 'Bundle', value: 'bundle' },
          { label: 'Downloadable', value: 'downloadable' },
          { label: 'Grouped', value: 'grouped' },
        ],
        { default: 'simple' }
      ),
      input.select(
        'status',
        'Status',
        [
          { label: 'Enabled', value: 1 },
          { label: 'Disabled', value: 2 },
        ],
        { default: 1 }
      ),
      input.select(
        'visibility',
        'Visibility',
        [
          { label: 'Not Visible Individually', value: 1 },
          { label: 'Catalog', value: 2 },
          { label: 'Search', value: 3 },
          { label: 'Catalog, Search', value: 4 },
        ],
        { default: 4 }
      ),
      input.number('weight', 'Weight', {
        description: 'Product weight',
      }),
      input.number('attributeSetId', 'Attribute Set ID', {
        description: 'Attribute set ID',
      }),
      input.json('customAttributes', 'Custom Attributes', {
        description: 'Custom attribute values',
        default: [],
      }),
      input.json('stockData', 'Stock Data', {
        description: 'Stock information',
        default: {},
      }),
      input.json('searchCriteria', 'Search Criteria', {
        description: 'Search criteria object',
        default: {},
      }),
      input.number('pageSize', 'Page Size', {
        description: 'Results per page',
        default: 20,
        min: 1,
        max: 100,
      }),
      input.number('currentPage', 'Current Page', {
        description: 'Page number',
        default: 1,
        min: 1,
      }),
      input.credential('credentialId', 'Magento Credentials', {
        description: 'Magento REST API integration token',
        credentialTypes: ['API_KEY', 'OAUTH2'],
        required: true,
      }),
    ],
    outputs: [
      output.boolean('success', 'Operation success'),
      output.array('items', 'List results'),
      output.object('item', 'Single item'),
      output.string('sku', 'Product SKU'),
      output.number('id', 'Entity ID'),
      output.number('totalCount', 'Total count'),
    ],
    defaults: {
      resource: 'products',
      operation: 'list',
      typeId: 'simple',
      status: 1,
      visibility: 4,
      pageSize: 20,
      currentPage: 1,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = MagentoNodeSchema.parse(nodeInput.config);

    logger.info(`Magento ${config.operation} on ${config.resource}`);

    switch (config.operation) {
      case 'list':
      case 'search':
        return {
          data: {
            success: true,
            items: [
              {
                id: 1,
                sku: 'PROD-001',
                name: 'Sample Product',
                price: 29.99,
                status: 1,
                visibility: 4,
                type_id: 'simple',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                extension_attributes: {
                  stock_item: {
                    qty: 100,
                    is_in_stock: true,
                  },
                },
              },
            ],
            totalCount: 150,
          },
        };

      case 'get':
        return {
          data: {
            success: true,
            item: {
              id: 1,
              sku: config.sku,
              name: 'Sample Product',
              price: 29.99,
              status: 1,
              visibility: 4,
              type_id: 'simple',
              custom_attributes: [
                { attribute_code: 'description', value: 'Product description' },
                { attribute_code: 'short_description', value: 'Short desc' },
              ],
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
            sku: config.sku || `SKU-${Date.now()}`,
            item: {
              id: Date.now(),
              sku: config.sku || `SKU-${Date.now()}`,
              name: config.name,
              price: config.price,
              status: config.status,
              visibility: config.visibility,
              type_id: config.typeId,
              created_at: new Date().toISOString(),
            },
          },
        };

      case 'update':
        return {
          data: {
            success: true,
            sku: config.sku,
            item: {
              sku: config.sku,
              name: config.name,
              price: config.price,
              updated_at: new Date().toISOString(),
            },
          },
        };

      case 'delete':
        return {
          data: {
            success: true,
            sku: config.sku,
            deleted: true,
          },
        };

      case 'updateStock':
        return {
          data: {
            success: true,
            sku: config.sku,
            stock_item: config.stockData,
          },
        };

      case 'addToCart':
        return {
          data: {
            success: true,
            cartId: config.cartId,
            item_id: Date.now(),
          },
        };

      case 'createInvoice':
        return {
          data: {
            success: true,
            invoiceId: Date.now(),
            orderId: config.orderId,
          },
        };

      case 'createShipment':
        return {
          data: {
            success: true,
            shipmentId: Date.now(),
            orderId: config.orderId,
          },
        };

      default:
        return { data: { success: false, error: 'Unknown operation' } };
    }
  }
);
