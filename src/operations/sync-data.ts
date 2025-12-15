import { z } from 'zod';
import { RetailCRMClient } from '../retailcrm/api-client.js';
import { SyncService } from '../services/sync-service.js';

export const syncDataToolDefinition = {
  name: 'sync_data',
  description: 'Manually trigger data synchronization from RetailCRM to database cache. Use this to refresh cached data before running analytics queries. Supports syncing orders, customers, or both.',
  inputSchema: z.object({
    entity: z.enum(['orders', 'customers', 'all']).default('all').describe('Which entity to sync: orders, customers, or all'),
  }),
};

export async function syncData(
  client: RetailCRMClient,
  args: z.infer<typeof syncDataToolDefinition.inputSchema>
) {
  const { entity } = args;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return {
      success: false,
      error: 'Supabase credentials not configured. Set SUPABASE_URL and SUPABASE_KEY environment variables.',
    };
  }

  const syncService = new SyncService(supabaseUrl, supabaseKey, client);

  try {
    let result: any;

    switch (entity) {
      case 'orders':
        result = await syncService.syncOrders();
        return {
          success: true,
          entity: 'orders',
          synced: result.synced,
          duration_ms: result.duration,
          message: `Synced ${result.synced} orders in ${result.duration}ms`,
        };

      case 'customers':
        result = await syncService.syncCustomers();
        return {
          success: true,
          entity: 'customers',
          synced: result.synced,
          duration_ms: result.duration,
          message: `Synced ${result.synced} customers in ${result.duration}ms`,
        };

      case 'all':
        result = await syncService.syncAll();
        return {
          success: true,
          entity: 'all',
          orders_synced: result.orders,
          customers_synced: result.customers,
          total_duration_ms: result.totalDuration,
          message: `Synced ${result.orders} orders and ${result.customers} customers in ${result.totalDuration}ms`,
        };

      default:
        return {
          success: false,
          error: `Unknown entity: ${entity}`,
        };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Sync failed: ${errorMessage}`,
    };
  }
}
