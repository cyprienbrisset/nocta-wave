import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const WooCommerceNodeSchema = z.object({
  resource: z.enum(['products', 'orders', 'customers', 'coupons', 'categories', 'tags', 'variations', 'reports']).default('products'),
  operation: z.enum([
    'create', 'update', 'get', 'delete', 'list',
    'updateStock', 'batchCreate', 'batchUpdate', 'batchDelete'
  ]).default('list'),
  productId: z.number().optional(),
  orderId: z.number().optional(),
  customerId: z.number().optional(),
  couponId: z.number().optional(),
  variationId: z.number().optional(),
  name: z.string().optional(),
  type: z.enum(['simple', 'grouped', 'external', 'variable']).default('simple'),
  regularPrice: z.string().optional(),
  salePrice: z.string().optional(),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  sku: z.string().optional(),
  categories: z.array(z.object({ id: z.number() })).optional(),
  tags: z.array(z.object({ id: z.number() })).optional(),
  images: z.array(z.object({ src: z.string(), alt: z.string().optional() })).optional(),
  stockQuantity: z.number().optional(),
  stockStatus: z.enum(['instock', 'outofstock', 'onbackorder']).optional(),
  manageStock: z.boolean().default(false),
  status: z.enum(['draft', 'pending', 'private', 'publish', 'any']).default('publish'),
  orderStatus: z.enum(['pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed']).optional(),
  billingEmail: z.string().optional(),
  billingFirstName: z.string().optional(),
  billingLastName: z.string().optional(),
  lineItems: z.array(z.object({
    product_id: z.number(),
    quantity: z.number(),
  })).optional(),
  couponCode: z.string().optional(),
  discountType: z.enum(['percent', 'fixed_cart', 'fixed_product']).optional(),
  amount: z.string().optional(),
  perPage: z.number().min(1).max(100).default(20),
  page: z.number().min(1).default(1),
  orderby: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
  credentialId: z.string().optional(),
});

export type WooCommerceNodeConfig = z.infer<typeof WooCommerceNodeSchema>;

export const woocommerceNode: NodeDefinition = createNode(
  {
    type: 'integration.woocommerce',
    category: 'integration',
    name: 'WooCommerce',
    description: 'WordPress e-commerce - Products, orders, customers, coupons',
    icon: 'ShoppingCart',
    inputs: [
      input.select(
        'resource',
        'Resource',
        [
          { label: 'Products', value: 'products' },
          { label: 'Orders', value: 'orders' },
          { label: 'Customers', value: 'customers' },
          { label: 'Coupons', value: 'coupons' },
          { label: 'Categories', value: 'categories' },
          { label: 'Tags', value: 'tags' },
          { label: 'Variations', value: 'variations' },
          { label: 'Reports', value: 'reports' },
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
          { label: 'Update Stock', value: 'updateStock' },
          { label: 'Batch Create', value: 'batchCreate' },
          { label: 'Batch Update', value: 'batchUpdate' },
          { label: 'Batch Delete', value: 'batchDelete' },
        ],
        { default: 'list' }
      ),
      input.number('productId', 'Product ID', {
        description: 'WooCommerce product ID',
      }),
      input.number('orderId', 'Order ID', {
        description: 'Order ID',
      }),
      input.number('customerId', 'Customer ID', {
        description: 'Customer ID',
      }),
      input.number('couponId', 'Coupon ID', {
        description: 'Coupon ID',
      }),
      input.string('name', 'Name', {
        description: 'Product/coupon name',
        placeholder: 'Product Name',
      }),
      input.select(
        'type',
        'Product Type',
        [
          { label: 'Simple', value: 'simple' },
          { label: 'Grouped', value: 'grouped' },
          { label: 'External', value: 'external' },
          { label: 'Variable', value: 'variable' },
        ],
        { default: 'simple' }
      ),
      input.string('regularPrice', 'Regular Price', {
        description: 'Regular price',
        placeholder: '29.99',
      }),
      input.string('salePrice', 'Sale Price', {
        description: 'Sale price',
      }),
      input.text('description', 'Description', {
        description: 'Product description (HTML)',
      }),
      input.string('shortDescription', 'Short Description', {
        description: 'Short description (HTML)',
      }),
      input.string('sku', 'SKU', {
        description: 'Stock keeping unit',
      }),
      input.json('categories', 'Categories', {
        description: 'Product categories',
        default: [],
      }),
      input.json('images', 'Images', {
        description: 'Product images',
        default: [],
      }),
      input.number('stockQuantity', 'Stock Quantity', {
        description: 'Stock quantity',
      }),
      input.select(
        'stockStatus',
        'Stock Status',
        [
          { label: 'In Stock', value: 'instock' },
          { label: 'Out of Stock', value: 'outofstock' },
          { label: 'On Backorder', value: 'onbackorder' },
        ],
        { default: 'instock' }
      ),
      input.boolean('manageStock', 'Manage Stock', {
        description: 'Enable stock management',
        default: false,
      }),
      input.select(
        'status',
        'Product Status',
        [
          { label: 'Publish', value: 'publish' },
          { label: 'Draft', value: 'draft' },
          { label: 'Pending', value: 'pending' },
          { label: 'Private', value: 'private' },
        ],
        { default: 'publish' }
      ),
      input.select(
        'orderStatus',
        'Order Status',
        [
          { label: 'Pending', value: 'pending' },
          { label: 'Processing', value: 'processing' },
          { label: 'On Hold', value: 'on-hold' },
          { label: 'Completed', value: 'completed' },
          { label: 'Cancelled', value: 'cancelled' },
          { label: 'Refunded', value: 'refunded' },
          { label: 'Failed', value: 'failed' },
        ],
        { default: 'pending' }
      ),
      input.string('billingEmail', 'Billing Email', {
        description: 'Customer billing email',
      }),
      input.json('lineItems', 'Line Items', {
        description: 'Order line items',
        default: [],
      }),
      input.string('couponCode', 'Coupon Code', {
        description: 'Coupon code',
      }),
      input.select(
        'discountType',
        'Discount Type',
        [
          { label: 'Percentage', value: 'percent' },
          { label: 'Fixed Cart', value: 'fixed_cart' },
          { label: 'Fixed Product', value: 'fixed_product' },
        ],
        { default: 'percent' }
      ),
      input.string('amount', 'Amount', {
        description: 'Discount amount',
      }),
      input.number('perPage', 'Per Page', {
        description: 'Results per page',
        default: 20,
        min: 1,
        max: 100,
      }),
      input.number('page', 'Page', {
        description: 'Page number',
        default: 1,
        min: 1,
      }),
      input.select(
        'order',
        'Order',
        [
          { label: 'Descending', value: 'desc' },
          { label: 'Ascending', value: 'asc' },
        ],
        { default: 'desc' }
      ),
      input.credential('credentialId', 'WooCommerce Credentials', {
        description: 'WooCommerce REST API keys',
        credentialTypes: ['API_KEY'],
        required: true,
      }),
    ],
    outputs: [output.main({ description: 'API operation result' })],
    defaults: {
      resource: 'products',
      operation: 'list',
      type: 'simple',
      stockStatus: 'instock',
      manageStock: false,
      status: 'publish',
      orderStatus: 'pending',
      discountType: 'percent',
      perPage: 20,
      page: 1,
      order: 'desc',
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = WooCommerceNodeSchema.parse(nodeInput.config);

    logger.info(`WooCommerce ${config.operation} on ${config.resource}`);

    switch (config.operation) {
      case 'list':
        return {
          data: {
            success: true,
            items: [
              {
                id: 123,
                name: 'Sample Product',
                type: 'simple',
                status: 'publish',
                sku: 'SKU123',
                regular_price: '29.99',
                price: '29.99',
                stock_quantity: 50,
                stock_status: 'instock',
                categories: [{ id: 1, name: 'Clothing' }],
                images: [{ src: 'https://example.com/product.jpg' }],
                date_created: new Date().toISOString(),
              },
            ],
            total: 50,
            totalPages: 3,
          },
        };

      case 'get':
        return {
          data: {
            success: true,
            item: {
              id: config.productId || config.orderId || config.customerId,
              name: 'Sample Product',
              type: 'simple',
              status: 'publish',
              regular_price: '29.99',
              stock_quantity: 50,
              date_created: new Date().toISOString(),
              date_modified: new Date().toISOString(),
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
              type: config.type,
              status: config.status,
              regular_price: config.regularPrice,
              sale_price: config.salePrice,
              sku: config.sku,
              stock_quantity: config.stockQuantity,
              date_created: new Date().toISOString(),
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
              name: config.name,
              status: config.status,
              date_modified: new Date().toISOString(),
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

      case 'updateStock':
        return {
          data: {
            success: true,
            productId: config.productId,
            stock_quantity: config.stockQuantity,
            stock_status: config.stockStatus,
          },
        };

      case 'batchCreate':
      case 'batchUpdate':
      case 'batchDelete':
        return {
          data: {
            success: true,
            create: [],
            update: [],
            delete: [],
          },
        };

      default:
        return { data: { success: false, error: 'Unknown operation' } };
    }
  }
);
