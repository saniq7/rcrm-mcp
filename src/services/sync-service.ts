import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { RetailCRMClient } from '../retailcrm/api-client.js';

export class SyncService {
  private supabase: SupabaseClient;
  private retailcrm: RetailCRMClient;

  constructor(supabaseUrl: string, supabaseKey: string, retailcrm: RetailCRMClient) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.retailcrm = retailcrm;
  }

  /**
   * Sync orders incrementally from RetailCRM to Supabase
   */
  async syncOrders(): Promise<{ synced: number; duration: number }> {
    const startTime = Date.now();
    
    // Get last sync timestamp
    const { data: metadata } = await this.supabase
      .from('sync_metadata')
      .select('last_sync_timestamp')
      .order('id', { ascending: false })
      .limit(1)
      .single();

    const lastSync = metadata?.last_sync_timestamp || '2020-01-01 00:00:00';
    console.log(`[Sync] Last order sync: ${lastSync}`);

    // Fetch orders from RetailCRM since last sync
    let page = 1;
    let totalSynced = 0;
    const limit = 100;

    while (true) {
      const response = await this.retailcrm.getOrders(
        {
          createdAtFrom: lastSync,
        },
        limit,
        page
      );

      if (!response.orders || response.orders.length === 0) break;

      // Transform and upsert orders
      const ordersToUpsert = response.orders.map((order: any) => ({
        id: order.id,
        number: order.number,
        external_id: order.externalId,
        created_at: order.createdAt,
        status: order.status,
        customer_id: order.customer?.id,
        customer_external_id: order.customer?.externalId,
        total_summ: order.totalSumm || order.sum,
        sum_paid: order.summ || 0,
        discount: order.discount || 0,
        source_source: order.source?.source,
        source_medium: order.source?.medium,
        source_campaign: order.source?.campaign,
        site: order.site,
        manager_id: order.managerId,
        custom_fields: order.customFields || {},
        raw_data: order,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await this.supabase
        .from('orders')
        .upsert(ordersToUpsert, { onConflict: 'id' });

      if (error) {
        console.error('[Sync] Error upserting orders:', error);
        throw error;
      }

      totalSynced += ordersToUpsert.length;
      console.log(`[Sync] Synced ${totalSynced} orders (page ${page})`);

      if (page >= response.pagination.totalPageCount) break;
      page++;
    }

    // Update sync metadata
    const duration = Date.now() - startTime;
    await this.supabase.from('sync_metadata').insert({
      last_sync_timestamp: new Date().toISOString(),
      orders_synced: totalSynced,
      sync_duration_ms: duration,
    });

    console.log(`[Sync] Completed: ${totalSynced} orders in ${duration}ms`);
    return { synced: totalSynced, duration };
  }

  /**
   * Sync customers incrementally from RetailCRM to Supabase
   */
  async syncCustomers(): Promise<{ synced: number; duration: number }> {
    const startTime = Date.now();
    
    // Get last customer sync timestamp
    const { data: metadata } = await this.supabase
      .from('sync_metadata')
      .select('last_customer_sync_timestamp')
      .order('id', { ascending: false })
      .limit(1)
      .single();

    const lastSync = metadata?.last_customer_sync_timestamp || '2020-01-01 00:00:00';
    console.log(`[Sync] Last customer sync: ${lastSync}`);

    // Fetch customers from RetailCRM since last sync
    let page = 1;
    let totalSynced = 0;
    const limit = 100;

    while (true) {
      const response = await this.retailcrm.getCustomers(
        {
          createdAtFrom: lastSync,
        },
        limit,
        page
      );

      if (!response.customers || response.customers.length === 0) break;

      // Transform and upsert customers
      const customersToUpsert = response.customers.map((customer: any) => ({
        id: customer.id,
        external_id: customer.externalId,
        first_name: customer.firstName,
        last_name: customer.lastName,
        email: customer.email,
        phone: customer.phones?.[0]?.number || customer.phone,
        created_at: customer.createdAt,
        vip: customer.vip || false,
        bad: customer.bad || false,
        tags: customer.tags || [],
        custom_fields: customer.customFields || {},
        ltv: customer.marginSumm || customer.totalSumm || 0,
        average_check: customer.averageCheck || 0,
        orders_count: customer.ordersCount || 0,
        raw_data: customer,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await this.supabase
        .from('customers')
        .upsert(customersToUpsert, { onConflict: 'id' });

      if (error) {
        console.error('[Sync] Error upserting customers:', error);
        throw error;
      }

      totalSynced += customersToUpsert.length;
      console.log(`[Sync] Synced ${totalSynced} customers (page ${page})`);

      if (page >= response.pagination.totalPageCount) break;
      page++;
    }

    // Update sync metadata
    const duration = Date.now() - startTime;
    await this.supabase
      .from('sync_metadata')
      .update({
        last_customer_sync_timestamp: new Date().toISOString(),
        customers_synced: totalSynced,
      })
      .eq('id', 1);

    console.log(`[Sync] Completed: ${totalSynced} customers in ${duration}ms`);
    return { synced: totalSynced, duration };
  }

  /**
   * Sync both orders and customers
   */
  async syncAll(): Promise<{ orders: number; customers: number; totalDuration: number }> {
    const startTime = Date.now();
    
    const ordersResult = await this.syncOrders();
    const customersResult = await this.syncCustomers();
    
    const totalDuration = Date.now() - startTime;
    
    return {
      orders: ordersResult.synced,
      customers: customersResult.synced,
      totalDuration,
    };
  }

  /**
   * Clean expired analytics cache
   */
  async cleanExpiredCache(): Promise<number> {
    const { data } = await this.supabase
      .from('analytics_cache')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select();

    const deleted = data?.length || 0;
    console.log(`[Sync] Cleaned ${deleted} expired cache entries`);
    return deleted;
  }
}
