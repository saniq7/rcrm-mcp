import { z } from 'zod';
import { RetailCRMClient } from '../retailcrm/api-client.js';

export const getOrderHistoryToolDefinition = {
  name: 'get_order_history',
  description: 'Retrieve the change history for orders. Useful for tracking status changes, field updates, and event timing. WARNING: This operation can be resource-intensive.',
  inputSchema: z.object({
    filter: z.object({
      startDate: z.string().optional().describe('Start date for history (YYYY-MM-DD HH:mm:ss)'),
      endDate: z.string().optional().describe('End date for history (YYYY-MM-DD HH:mm:ss)'),
      orderId: z.number().optional().describe('Filter by specific order ID'),
      orderNumber: z.string().optional().describe('Filter by specific order number'),
    }).optional(),
    limit: z.number().min(1).max(100).default(20).describe('Number of history records to retrieve'),
    page: z.number().min(1).default(1).describe('Page number'),
  }),
};

export async function getOrderHistory(
  client: RetailCRMClient,
  args: z.infer<typeof getOrderHistoryToolDefinition.inputSchema>
) {
  const { filter, limit, page } = args;

  // RetailCRM /api/v5/orders/history endpoint
  // It supports filter[startDate], filter[endDate], filter[orderId]
  
  const apiFilter: any = {};
  if (filter?.startDate) apiFilter.startDate = filter.startDate;
  if (filter?.endDate) apiFilter.endDate = filter.endDate;
  if (filter?.orderId) apiFilter.orderId = filter.orderId;
  
  // If orderNumber is provided, we might need to resolve it to ID first, 
  // but the history API mainly works with IDs or dates.
  // Actually, RetailCRM history filter has `orderId` (int).
  // If user passes `orderNumber`, we might need to fetch the order first.
  if (filter?.orderNumber) {
    const orders = await client.getOrders({ numbers: [filter.orderNumber] });
    if (orders.orders.length > 0) {
      apiFilter.orderId = orders.orders[0].id;
    } else {
      return {
        history: [],
        meta: { message: `Order with number ${filter.orderNumber} not found` }
      };
    }
  }

  const response = await client.getOrderHistory(apiFilter, limit, page);

  return {
    history: response.history,
    pagination: response.pagination
  };
}
