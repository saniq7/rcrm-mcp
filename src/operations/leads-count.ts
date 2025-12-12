import { RetailCRMClient } from '../retailcrm/api-client.js';
import { globalCache } from '../utils/cache.js';

export interface LeadsCountParams {
  date_from: string;
  date_to: string;
}

export interface LeadsCountResult {
  total_leads: number;
  leads_by_day: Array<{
    date: string;
    count: number;
  }>;
  period: {
    from: string;
    to: string;
  };
}

/**
 * Получить количество лидов за период
 * Лиды - это новые клиенты, созданные в системе
 */
export async function getLeadsCount(
  client: RetailCRMClient,
  params: LeadsCountParams
): Promise<LeadsCountResult> {
  const cacheKey = `leads_count_${params.date_from}_${params.date_to}`;
  
  // Проверить кэш
  const cached = globalCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Получить клиентов за период
  // В v2.0 getCustomers возвращает { customers: [], pagination: {} }
  const response = await client.getCustomers({
    createdAtFrom: params.date_from,
    createdAtTo: params.date_to,
  }, 100); // Берем первые 100 для примера, или нужно делать пагинацию

  const customers = response.customers || [];

  // Агрегировать по дням
  const dayMap: Record<string, number> = {};

  for (const customer of customers) {
    const date = customer.createdAt.split(' ')[0]; // Получить дату без времени (RetailCRM format YYYY-MM-DD HH:MM:SS)
    
    if (!dayMap[date]) {
      dayMap[date] = 0;
    }

    dayMap[date]++;
  }

  // Построить результат
  const leads_by_day = Object.entries(dayMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const result: LeadsCountResult = {
    total_leads: customers.length,
    leads_by_day,
    period: {
      from: params.date_from,
      to: params.date_to,
    },
  };

  // Сохранить в кэш
  globalCache.set(cacheKey, result, 1800000); // 30 минут

  return result;
}
