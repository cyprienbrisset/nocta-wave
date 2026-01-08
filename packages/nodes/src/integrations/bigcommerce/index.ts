import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const BigCommerceNodeSchema = z.object({
  resource: z.enum(['products', 'orders', 'customers', 'categories', 'brands', 'coupons', 'webhooks']).default('products'),
  operation: z.enum([
    'create', 'update', 'get', 'delete', 'list',
    'updateInventory', 'addVariant', 'updateOrderStatus'
  ]).default('list'),
  productId: z.number().optional(),
  orderId: z.number().optional(),
  customerId: z.number().optional(),
  categoryId: z.number().optional(),
  brandId: z.number().optional(),
  couponId: z.number().optional(),
  name: z.string().optional(),
  sku: z.string().optional(),
  price: z.number().optional(),
  salePrice: z.number().optional(),
  type: z.enum(['physical', 'digital']).default('physical'),
  weight: z.number().optional(),
  description: z.string().optional(),
  inventoryLevel: z.number().optional(),
  inventoryTracking: z.enum(['none', 'product', 'variant']).default('none'),
  isVisible: z.boolean().default(true),
  availability: z.enum(['available', 'disabled', 'preorder']).default('available'),
  categories: z.array(z.number()).optional(),
  orderStatus: z.number().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(250).default(50),
  credentialId: z.string().optional(),
});

export type BigCommerceNodeConfig = z.infer<typeof BigCommerceNodeSchema>;

export const bigcommerceNode: NodeDefinition = createNode(
  {
    type: 'integration.bigcommerce',
    category: 'integration',
    name: 'BigCommerce',
    description: 'E-commerce platform - Products, orders, customers',
    icon: 'ShoppingBag',
    inputs: [
      input.select(
        'resource',
        'Resource',
        [
          { label: 'Products', value: 'products' },
          { label: 'Orders', value: 'orders' },
          { label: 'Customers', value: 'customers' },
          { label: 'Categories', value: 'categories' },
          { label: 'Brands', value: 'brands' },
          { label: 'Coupons', value: 'coupons' },
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
          { label: 'Update Inventory', value: 'updateInventory' },
          { label: 'Add Variant', value: 'addVariant' },
          { label: 'Update Order Status', value: 'updateOrderStatus' },
        ],
        { default: 'list' }
      ),
      input.number('productId', 'Product ID', {
        description: 'BigCommerce product ID',
      }),
      input.number('orderId', 'Order ID', {
        description: 'Order ID',
      }),
      input.number('customerId', 'Customer ID', {
        description: 'Customer ID',
      }),
      input.number('categoryId', 'Category ID', {
        description: 'Category ID',
      }),
      input.number('brandId', 'Brand ID', {
        description: 'Brand ID',
      }),
      input.string('name', 'Name', {
        description: 'Product/category name',
        placeholder: 'Product Name',
      }),
      input.string('sku', 'SKU', {
        description: 'Product SKU',
        placeholder: 'SKU-001',
      }),
      input.number('price', 'Price', {
        description: 'Product price',
      }),
      input.number('salePrice', 'Sale Price', {
        description: 'Sale price',
      }),
      input.select(
        'type',
        'Product Type',
        [
          { label: 'Physical', value: 'physical' },
          { label: 'Digital', value: 'digital' },
        ],
        { default: 'physical' }
      ),
      input.number('weight', 'Weight', {
        description: 'Product weight',
      }),
      input.text('description', 'Description', {
        description: 'Product description',
      }),
      input.number('inventoryLevel', 'Inventory Level', {
        description: 'Stock quantity',
      }),
      input.select(
        'inventoryTracking',
        'Inventory Tracking',
        [
          { label: 'None', value: 'none' },
          { label: 'Product Level', value: 'product' },
          { label: 'Variant Level', value: 'variant' },
        ],
        { default: 'none' }
      ),
      input.boolean('isVisible', 'Visible', {
        description: 'Product visibility',
        default: true,
      }),
      input.select(
        'availability',
        'Availability',
        [
          { label: 'Available', value: 'available' },
          { label: 'Disabled', value: 'disabled' },
          { label: 'Pre-order', value: 'preorder' },
        ],
        { default: 'available' }
      ),
      input.json('categories', 'Categories', {
        description: 'Array of category IDs',
        default: [],
      }),
      input.number('orderStatus', 'Order Status', {
        description: 'Order status ID',
      }),
      input.number('page', 'Page', {
        description: 'Page number',
        default: 1,
        min: 1,
      }),
      input.number('limit', 'Limit', {
        description: 'Results per page',
        default: 50,
        min: 1,
        max: 250,
      }),
      input.credential('credentialId', 'BigCommerce Credentials', {
        description: 'BigCommerce API credentials (Store Hash + Access Token)',
        credentialTypes: ['API_KEY'],
        required: true,
      }),
    ],
    outputs: [output.main({ description: 'API operation result' })],
    defaults: {
      resource: 'products',
      operation: 'list',
      type: 'physical',
      inventoryTracking: 'none',
      isVisible: true,
      availability: 'available',
      page: 1,
      limit: 50,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = BigCommerceNodeSchema.parse(nodeInput.config);

    logger.info(`BigCommerce ${config.operation} on ${config.resource}`);

    switch (config.operation) {
      case 'list':
        return {
          data: {
            success: true,
            items: [
              {
                id: 111,
                name: 'Sample Product',
                sku: 'PROD-001',
                price: 49.99,
                sale_price: 39.99,
                type: 'physical',
                weight: 1.5,
                inventory_level: 100,
                inventory_tracking: 'product',
                is_visible: true,
                availability: 'available',
                categories: [1, 2],
                date_created: new Date().toISOString(),
                date_modified: new Date().toISOString(),
              },
            ],
            totalCount: 250,
          },
        };

      case 'get':
        return {
          data: {
            success: true,
            item: {
              id: config.productId || config.orderId || config.customerId,
              name: 'Sample Product',
              sku: 'PROD-001',
              price: 49.99,
              description: 'Product description',
              type: 'physical',
              weight: 1.5,
              inventory_level: 100,
              is_visible: true,
              categories: [1, 2],
              images: [
                { id: 1, url_standard: 'https://example.com/image.jpg', is_thumbnail: true },
              ],
              variants: [
                { id: 1, sku: 'PROD-001-S', price: 49.99, inventory_level: 50 },
              ],
              date_created: new Date().toISOString(),
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
              name: config.name,
              sku: config.sku,
              price: config.price,
              type: config.type,
              is_visible: config.isVisible,
              availability: config.availability,
              date_created: new Date().toISOString(),
            },
          },
        };

      case 'update':
        return {
          data: {
            success: true,
            id: config.productId,
            item: {
              id: config.productId,
              name: config.name,
              price: config.price,
              date_modified: new Date().toISOString(),
            },
          },
        };

      case 'delete':
        return {
          data: {
            success: true,
            id: config.productId || config.orderId,
            deleted: true,
          },
        };

      case 'updateInventory':
        return {
          data: {
            success: true,
            productId: config.productId,
            inventory_level: config.inventoryLevel,
          },
        };

      case 'addVariant':
        return {
          data: {
            success: true,
            productId: config.productId,
            variant: {
              id: Date.now(),
              sku: config.sku,
              price: config.price,
              inventory_level: config.inventoryLevel,
            },
          },
        };

      case 'updateOrderStatus':
        return {
          data: {
            success: true,
            orderId: config.orderId,
            status_id: config.orderStatus,
          },
        };

      default:
        return { data: { success: false, error: 'Unknown operation' } };
    }
  }
);
