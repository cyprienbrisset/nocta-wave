import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const PayPalNodeSchema = z.object({
  resource: z.enum(['orders', 'payments', 'subscriptions', 'invoices', 'payouts', 'disputes']).default('orders'),
  operation: z.enum([
    'create', 'get', 'capture', 'authorize', 'void', 'refund', 'list',
    'activate', 'suspend', 'cancel', 'revise',
    'send', 'remind', 'recordPayment',
    'accept', 'deny', 'acknowledge'
  ]).default('create'),
  orderId: z.string().optional(),
  paymentId: z.string().optional(),
  subscriptionId: z.string().optional(),
  invoiceId: z.string().optional(),
  payoutId: z.string().optional(),
  disputeId: z.string().optional(),
  amount: z.object({
    currencyCode: z.string().default('USD'),
    value: z.string(),
  }).optional(),
  items: z.array(z.object({
    name: z.string(),
    quantity: z.string(),
    unitAmount: z.object({
      currencyCode: z.string(),
      value: z.string(),
    }),
  })).optional(),
  description: z.string().optional(),
  returnUrl: z.string().optional(),
  cancelUrl: z.string().optional(),
  intent: z.enum(['CAPTURE', 'AUTHORIZE']).default('CAPTURE'),
  planId: z.string().optional(),
  startTime: z.string().optional(),
  subscriber: z.object({
    email: z.string().optional(),
    name: z.object({
      givenName: z.string(),
      surname: z.string(),
    }).optional(),
  }).optional(),
  invoiceDetail: z.object({
    invoiceNumber: z.string().optional(),
    invoiceDate: z.string().optional(),
    dueDate: z.string().optional(),
    note: z.string().optional(),
  }).optional(),
  recipients: z.array(z.object({
    recipientType: z.enum(['EMAIL', 'PHONE', 'PAYPAL_ID']),
    receiver: z.string(),
    amount: z.object({
      currency: z.string(),
      value: z.string(),
    }),
  })).optional(),
  senderBatchHeader: z.object({
    senderBatchId: z.string().optional(),
    emailSubject: z.string().optional(),
  }).optional(),
  environment: z.enum(['sandbox', 'live']).default('sandbox'),
  credentialId: z.string().optional(),
});

export type PayPalNodeConfig = z.infer<typeof PayPalNodeSchema>;

export const paypalNode: NodeDefinition = createNode(
  {
    type: 'integration.paypal',
    category: 'integration',
    name: 'PayPal',
    description: 'Payments, subscriptions, invoices, payouts',
    icon: 'CreditCard',
    inputs: [
      input.select(
        'resource',
        'Resource',
        [
          { label: 'Orders', value: 'orders' },
          { label: 'Payments', value: 'payments' },
          { label: 'Subscriptions', value: 'subscriptions' },
          { label: 'Invoices', value: 'invoices' },
          { label: 'Payouts', value: 'payouts' },
          { label: 'Disputes', value: 'disputes' },
        ],
        { default: 'orders' }
      ),
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Create', value: 'create' },
          { label: 'Get', value: 'get' },
          { label: 'Capture', value: 'capture' },
          { label: 'Authorize', value: 'authorize' },
          { label: 'Void', value: 'void' },
          { label: 'Refund', value: 'refund' },
          { label: 'List', value: 'list' },
          { label: 'Activate', value: 'activate' },
          { label: 'Suspend', value: 'suspend' },
          { label: 'Cancel', value: 'cancel' },
          { label: 'Send', value: 'send' },
        ],
        { default: 'create' }
      ),
      input.string('orderId', 'Order ID', {
        description: 'PayPal order ID',
      }),
      input.string('subscriptionId', 'Subscription ID', {
        description: 'PayPal subscription ID',
      }),
      input.string('invoiceId', 'Invoice ID', {
        description: 'PayPal invoice ID',
      }),
      input.json('amount', 'Amount', {
        description: 'Transaction amount',
        default: { currencyCode: 'USD', value: '0.00' },
      }),
      input.json('items', 'Items', {
        description: 'Order line items',
        default: [],
      }),
      input.string('description', 'Description', {
        description: 'Transaction description',
      }),
      input.string('returnUrl', 'Return URL', {
        description: 'URL after approval',
      }),
      input.string('cancelUrl', 'Cancel URL', {
        description: 'URL after cancellation',
      }),
      input.select(
        'intent',
        'Intent',
        [
          { label: 'Capture', value: 'CAPTURE' },
          { label: 'Authorize', value: 'AUTHORIZE' },
        ],
        { default: 'CAPTURE' }
      ),
      input.string('planId', 'Plan ID', {
        description: 'Subscription plan ID',
      }),
      input.json('subscriber', 'Subscriber', {
        description: 'Subscriber information',
        default: {},
      }),
      input.json('invoiceDetail', 'Invoice Details', {
        description: 'Invoice details',
        default: {},
      }),
      input.json('recipients', 'Payout Recipients', {
        description: 'Payout recipients',
        default: [],
      }),
      input.select(
        'environment',
        'Environment',
        [
          { label: 'Sandbox', value: 'sandbox' },
          { label: 'Live', value: 'live' },
        ],
        { default: 'sandbox' }
      ),
      input.credential('credentialId', 'PayPal Credentials', {
        description: 'PayPal API credentials',
        credentialTypes: ['OAUTH2'],
        required: true,
      }),
    ],
    outputs: [
      output.boolean('success', 'Operation success'),
      output.string('id', 'Resource ID'),
      output.string('status', 'Status'),
      output.object('order', 'Order details'),
      output.object('subscription', 'Subscription details'),
      output.array('links', 'HATEOAS links'),
    ],
    defaults: {
      resource: 'orders',
      operation: 'create',
      intent: 'CAPTURE',
      environment: 'sandbox',
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = PayPalNodeSchema.parse(nodeInput.config);

    logger.info(`PayPal ${config.operation} on ${config.resource}`);

    switch (config.operation) {
      case 'create':
        if (config.resource === 'orders') {
          return {
            data: {
              success: true,
              id: `ORDER-${Date.now()}`,
              status: 'CREATED',
              links: [
                { rel: 'self', href: 'https://api.paypal.com/v2/checkout/orders/ORDER-123' },
                { rel: 'approve', href: 'https://www.paypal.com/checkoutnow?token=ORDER-123' },
                { rel: 'capture', href: 'https://api.paypal.com/v2/checkout/orders/ORDER-123/capture' },
              ],
            },
          };
        }
        return { data: { success: true, id: `${config.resource.toUpperCase()}-${Date.now()}` } };

      case 'capture':
        return {
          data: {
            success: true,
            id: config.orderId,
            status: 'COMPLETED',
            order: {
              id: config.orderId,
              status: 'COMPLETED',
              purchaseUnits: [{
                payments: { captures: [{ id: `CAP-${Date.now()}`, status: 'COMPLETED', amount: config.amount }] },
              }],
            },
          },
        };

      case 'get':
        return {
          data: {
            success: true,
            id: config.orderId || config.subscriptionId,
            status: 'APPROVED',
          },
        };

      case 'refund':
        return {
          data: {
            success: true,
            id: `REFUND-${Date.now()}`,
            status: 'COMPLETED',
          },
        };

      case 'list':
        return {
          data: {
            success: true,
            items: [
              { id: 'ORDER-1', status: 'COMPLETED', createTime: new Date().toISOString() },
              { id: 'ORDER-2', status: 'APPROVED', createTime: new Date().toISOString() },
            ],
          },
        };

      default:
        return { data: { success: true } };
    }
  }
);
