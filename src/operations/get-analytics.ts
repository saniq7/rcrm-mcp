import { z } from 'zod';
import { RetailCRMClient } from '../retailcrm/api-client.js';

export const getAnalyticsToolDefinition = {
  name: 'get_analytics',
  description: 'Get aggregated analytics for orders. Useful for building charts and reports without fetching raw data. Supports grouping by time (day, week, month) and by field (source, status, etc.).',
  inputSchema: z.object({
    dateFrom: z.string().describe('Start date in YYYY-MM-DD format'),
    dateTo: z.string().describe('End date in YYYY-MM-DD format'),
    metrics: z.array(z.enum(['count', 'sum'])).default(['count']).describe('Metrics to calculate: count (number of orders) or sum (total sum of orders)'),
    groupBy: z.enum(['day', 'week', 'month']).describe('Time interval for grouping'),
    splitBy: z.string().optional().describe('Field to split data by (e.g., "source.source", "status", "customFields.adress_client"). Supports dot notation.'),
    filter: z.object({
      status: z.array(z.string()).optional(),
      sites: z.array(z.string()).optional(),
      customFields: z.record(z.string(), z.any()).optional().describe('Filter by custom fields. Use "exists" to check for presence.'),
    }).optional(),
  }),
};

export async function getAnalytics(
  client: RetailCRMClient,
  args: z.infer<typeof getAnalyticsToolDefinition.inputSchema>
) {
  const { dateFrom, dateTo, metrics, groupBy, splitBy, filter } = args;

  // Fetch all orders for the period
  // We use a generator or pagination to handle large datasets efficiently
  const allOrders = [];
  let page = 1;
  const limit = 100; // Maximize batch size for speed

  while (true) {
    const response = await client.getOrders(
      {
        createdAtFrom: `${dateFrom} 00:00:00`,
        createdAtTo: `${dateTo} 23:59:59`,
        ...filter,
      },
      limit,
      page
    );

    if (!response.orders || response.orders.length === 0) break;
    
    allOrders.push(...response.orders);
    
    if (page >= response.pagination.totalPageCount) break;
    page++;
  }

  // Aggregation Logic
  const result: Record<string, any> = {};

  for (const order of allOrders) {
    const date = new Date(order.createdAt);
    let timeKey = '';

    // 1. Group by Time
    if (groupBy === 'day') {
      timeKey = date.toISOString().split('T')[0];
    } else if (groupBy === 'week') {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + 4 - (d.getDay() || 7));
      const yearStart = new Date(d.getFullYear(), 0, 1);
      const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      timeKey = `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
    } else if (groupBy === 'month') {
      timeKey = order.createdAt.substring(0, 7); // YYYY-MM
    }

    if (!result[timeKey]) result[timeKey] = {};

    // 2. Split by Field (Dimension)
    let splitKey = 'total';
    if (splitBy) {
      splitKey = getNestedValue(order, splitBy) || 'undefined';
    }

    if (!result[timeKey][splitKey]) {
      result[timeKey][splitKey] = { count: 0, sum: 0 };
    }

    // 3. Calculate Metrics
    result[timeKey][splitKey].count++;
    result[timeKey][splitKey].sum += order.totalSumm || 0;
  }

  // Format Output
  const formattedResult = Object.entries(result).map(([period, data]) => ({
    period,
    data
  })).sort((a, b) => a.period.localeCompare(b.period));

  return {
    meta: {
      totalOrders: allOrders.length,
      period: { from: dateFrom, to: dateTo },
      groupBy,
      splitBy
    },
    analytics: formattedResult
  };
}

function getNestedValue(obj: any, path: string): string | null {
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : null, obj);
}
