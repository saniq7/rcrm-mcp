import { z } from 'zod';
import { RetailCRMClient } from '../retailcrm/api-client.js';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

export const getAnalyticsV2ToolDefinition = {
  name: 'get_analytics',
  description: 'Get aggregated analytics for orders with database caching. Ultra-fast response (<1s) for cached data. Supports grouping by time (day, week, month) and filtering by custom fields.',
  inputSchema: z.object({
    dateFrom: z.string().describe('Start date in YYYY-MM-DD format'),
    dateTo: z.string().describe('End date in YYYY-MM-DD format'),
    metrics: z.array(z.enum(['count', 'sum'])).default(['count']).describe('Metrics to calculate: count (number of orders) or sum (total sum of orders)'),
    groupBy: z.enum(['day', 'week', 'month']).describe('Time interval for grouping'),
    splitBy: z.string().optional().describe('Field to split data by (e.g., "source_source", "status"). Note: use underscore notation for nested fields.'),
    filter: z.object({
      status: z.array(z.string()).optional(),
      sites: z.array(z.string()).optional(),
      customFields: z.record(z.string(), z.any()).optional().describe('Filter by custom fields. Use "exists" to check for presence (e.g., {"adress_client": "exists"}).'),
    }).optional(),
  }),
};

export async function getAnalyticsV2(
  client: RetailCRMClient,
  args: z.infer<typeof getAnalyticsV2ToolDefinition.inputSchema>
) {
  const { dateFrom, dateTo, metrics, groupBy, splitBy, filter } = args;

  // Try database-first approach
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
      
      // Check if we have data in cache for this period
      const { data: cachedOrders, error } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', `${dateFrom}T00:00:00Z`)
        .lte('created_at', `${dateTo}T23:59:59Z`);

      if (!error && cachedOrders && cachedOrders.length > 0) {
        console.log(`[Analytics V2] Using cached data: ${cachedOrders.length} orders`);
        
        // Apply filters on cached data
        let filteredOrders = cachedOrders;
        
        // Filter by status
        if (filter?.status && filter.status.length > 0) {
          filteredOrders = filteredOrders.filter(o => filter.status!.includes(o.status));
        }
        
        // Filter by sites
        if (filter?.sites && filter.sites.length > 0) {
          filteredOrders = filteredOrders.filter(o => filter.sites!.includes(o.site));
        }
        
        // Filter by custom fields
        if (filter?.customFields) {
          filteredOrders = filteredOrders.filter(order => {
            for (const [field, value] of Object.entries(filter.customFields!)) {
              if (value === 'exists') {
                // Check if field exists in custom_fields JSONB
                if (!order.custom_fields || !order.custom_fields[field]) {
                  return false;
                }
              } else {
                // Exact match
                if (!order.custom_fields || order.custom_fields[field] !== value) {
                  return false;
                }
              }
            }
            return true;
          });
        }
        
        // Aggregate data
        const result = aggregateOrders(filteredOrders, groupBy, splitBy);
        
        return {
          meta: {
            totalOrders: filteredOrders.length,
            period: { from: dateFrom, to: dateTo },
            groupBy,
            splitBy,
            source: 'cache',
            cacheHit: true
          },
          analytics: result
        };
      }
    } catch (dbError) {
      console.error('[Analytics V2] Database error, falling back to API:', dbError);
    }
  }

  // Fallback to API with PROPER filtering (no post-filtering!)
  console.log('[Analytics V2] Fetching from API with filters');
  
  const allOrders = [];
  let page = 1;
  const limit = 100;

  // Build API filter properly
  const apiFilter: any = {
    createdAtFrom: `${dateFrom} 00:00:00`,
    createdAtTo: `${dateTo} 23:59:59`,
  };

  // Add status filter to API request
  if (filter?.status && filter.status.length > 0) {
    apiFilter.status = filter.status;
  }

  // Add sites filter to API request
  if (filter?.sites && filter.sites.length > 0) {
    apiFilter.sites = filter.sites;
  }

  // CRITICAL FIX: Add custom fields filter to API request
  // RetailCRM API supports filtering by custom fields directly!
  if (filter?.customFields) {
    apiFilter.customFields = {};
    for (const [field, value] of Object.entries(filter.customFields)) {
      if (value === 'exists') {
        // For existence check, we still need to fetch and filter
        // RetailCRM API doesn't support "exists" operator directly
        // So we'll fetch all and filter in memory (but only for this specific case)
        continue;
      } else {
        // For exact match, pass to API
        apiFilter.customFields[field] = value;
      }
    }
  }

  while (true) {
    const response = await client.getOrders(apiFilter, limit, page);

    if (!response.orders || response.orders.length === 0) break;
    
    allOrders.push(...response.orders);
    
    if (page >= response.pagination.totalPageCount) break;
    page++;
  }

  // Post-filter ONLY for "exists" checks (unavoidable)
  let filteredOrders = allOrders;
  if (filter?.customFields) {
    for (const [field, value] of Object.entries(filter.customFields)) {
      if (value === 'exists') {
        filteredOrders = filteredOrders.filter(order => 
          order.customFields && order.customFields[field] !== undefined
        );
      }
    }
  }

  // Aggregate data
  const result = aggregateOrders(filteredOrders, groupBy, splitBy);

  return {
    meta: {
      totalOrders: filteredOrders.length,
      period: { from: dateFrom, to: dateTo },
      groupBy,
      splitBy,
      source: 'api',
      cacheHit: false
    },
    analytics: result
  };
}

function aggregateOrders(orders: any[], groupBy: string, splitBy?: string) {
  const result: Record<string, any> = {};

  for (const order of orders) {
    const date = new Date(order.created_at || order.createdAt);
    let timeKey = '';

    // Group by Time
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
      const createdAt = order.created_at || order.createdAt;
      timeKey = createdAt.substring(0, 7); // YYYY-MM
    }

    if (!result[timeKey]) result[timeKey] = {};

    // Split by Field
    let splitKey = 'total';
    if (splitBy) {
      // Handle both snake_case (DB) and camelCase (API)
      const value = order[splitBy] || getNestedValue(order, splitBy.replace(/_/g, '.'));
      splitKey = value || 'undefined';
    }

    if (!result[timeKey][splitKey]) {
      result[timeKey][splitKey] = { count: 0, sum: 0 };
    }

    // Calculate Metrics
    result[timeKey][splitKey].count++;
    const sumValue = order.total_summ || order.totalSumm || 0;
    result[timeKey][splitKey].sum += sumValue;
  }

  // Format Output
  return Object.entries(result)
    .map(([period, data]) => ({ period, data }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

function getNestedValue(obj: any, path: string): string | null {
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : null, obj);
}
