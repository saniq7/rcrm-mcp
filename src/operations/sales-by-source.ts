import { RetailCRMClient } from '../retailcrm/api-client.js';
import { globalCache } from '../utils/cache.js';

export interface SalesBySourceParams {
  date_from: string;
  date_to: string;
  source_id?: string;
}

export interface SalesBySourceResult {
  sources: Array<{
    source_id: string;
    source_name: string;
    registration_count: number;
    total_sum: number;
    average_sum: number;
  }>;
  total_registrations: number;
  total_sum: number;
  period: {
    from: string;
    to: string;
  };
}

/**
 * Получить продажи по источникам за период
 */
export async function getSalesBySource(
  client: RetailCRMClient,
  params: SalesBySourceParams
): Promise<SalesBySourceResult> {
  const cacheKey = `sales_by_source_${params.date_from}_${params.date_to}_${params.source_id || 'all'}`;
  
  // Проверить кэш
  const cached = globalCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Получить каналы (источники)
  const channelsCacheKey = 'channels_list';
  let channels = globalCache.get(channelsCacheKey);
  if (!channels) {
    channels = await client.getChannels();
    globalCache.set(channelsCacheKey, channels, 3600000); // 1 час
  }

  // Получить заказы за период
  // В v2.0 getOrders возвращает { orders: [], pagination: {} }
  const response = await client.getOrders({
    createdAtFrom: params.date_from,
    createdAtTo: params.date_to,
  }, 100);
  
  const orders = response.orders || [];

  // Агрегировать по источникам
  const sourceMap: Record<string, { count: number; sum: number }> = {};

  for (const order of orders) {
    const sourceCode = order.source?.code || 'unknown';
    
    if (!sourceMap[sourceCode]) {
      sourceMap[sourceCode] = { count: 0, sum: 0 };
    }

    sourceMap[sourceCode].count++;
    sourceMap[sourceCode].sum += order.sum || 0;
  }

  // Построить результат
  const sources = Object.entries(sourceMap).map(([sourceCode, data]) => {
    const channelInfo = (channels as any[]).find((c: any) => c.code === sourceCode);
    const sourceName = channelInfo?.name || sourceCode;

    return {
      source_id: sourceCode,
      source_name: sourceName,
      registration_count: data.count,
      total_sum: data.sum,
      average_sum: data.count > 0 ? Math.round((data.sum / data.count) * 100) / 100 : 0,
    };
  });

  // Отсортировать по количеству регистраций
  sources.sort((a, b) => b.registration_count - a.registration_count);

  const result: SalesBySourceResult = {
    sources,
    total_registrations: orders.length,
    total_sum: orders.reduce((sum: number, order: any) => sum + (order.sum || 0), 0),
    period: {
      from: params.date_from,
      to: params.date_to,
    },
  };

  // Сохранить в кэш
  globalCache.set(cacheKey, result, 1800000); // 30 минут

  return result;
}
