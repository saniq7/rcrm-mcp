import { RetailCRMClient } from '../retailcrm/api-client.js';
import { globalCache } from '../utils/cache.js';

export interface RegistrationStatsParams {
  date_from: string;
  date_to: string;
}

export interface RegistrationStatsResult {
  by_method: Array<{
    method_id: string;
    method_name: string;
    registration_count: number;
    total_sum: number;
    average_sum: number;
  }>;
  by_month: Array<{
    month: string;
    registration_count: number;
    total_sum: number;
  }>;
  by_method_and_month: Array<{
    month: string;
    method_id: string;
    method_name: string;
    registration_count: number;
    total_sum: number;
  }>;
  total_registrations: number;
  total_sum: number;
  period: {
    from: string;
    to: string;
  };
}

/**
 * Получить статистику по способам регистрации за период
 */
export async function getRegistrationStats(
  client: RetailCRMClient,
  params: RegistrationStatsParams
): Promise<RegistrationStatsResult> {
  const cacheKey = `registration_stats_${params.date_from}_${params.date_to}`;
  
  // Проверить кэш
  const cached = globalCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Получить методы оформления заказов
  const methodsCacheKey = 'order_methods_list';
  let methods = globalCache.get(methodsCacheKey);
  if (!methods) {
    methods = await client.getOrderMethods();
    globalCache.set(methodsCacheKey, methods, 3600000); // 1 час
  }

  // Получить заказы за период
  // В v2.0 getOrders возвращает { orders: [], pagination: {} }
  const response = await client.getOrders({
    createdAtFrom: params.date_from,
    createdAtTo: params.date_to,
  }, 100);
  
  const orders = response.orders || [];

  // Агрегировать по методам
  const methodMap: Record<string, { count: number; sum: number }> = {};
  const monthMap: Record<string, { count: number; sum: number }> = {};
  const methodMonthMap: Record<string, { count: number; sum: number }> = {};

  for (const order of orders) {
    const methodCode = order.orderMethod?.code || 'unknown';
    const orderDate = new Date(order.createdAt);
    const month = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;

    // По методам
    if (!methodMap[methodCode]) {
      methodMap[methodCode] = { count: 0, sum: 0 };
    }
    methodMap[methodCode].count++;
    methodMap[methodCode].sum += order.sum || 0;

    // По месяцам
    if (!monthMap[month]) {
      monthMap[month] = { count: 0, sum: 0 };
    }
    monthMap[month].count++;
    monthMap[month].sum += order.sum || 0;

    // По методам и месяцам
    const key = `${month}_${methodCode}`;
    if (!methodMonthMap[key]) {
      methodMonthMap[key] = { count: 0, sum: 0 };
    }
    methodMonthMap[key].count++;
    methodMonthMap[key].sum += order.sum || 0;
  }

  // Построить результат по методам
  const by_method = Object.entries(methodMap).map(([methodCode, data]) => {
    const methodInfo = (methods as any[]).find((m: any) => m.code === methodCode);
    const methodName = methodInfo?.name || methodCode;

    return {
      method_id: methodCode,
      method_name: methodName,
      registration_count: data.count,
      total_sum: data.sum,
      average_sum: data.count > 0 ? Math.round((data.sum / data.count) * 100) / 100 : 0,
    };
  });

  by_method.sort((a, b) => b.registration_count - a.registration_count);

  // Построить результат по месяцам
  const by_month = Object.entries(monthMap)
    .map(([month, data]) => ({
      month,
      registration_count: data.count,
      total_sum: data.sum,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Построить результат по методам и месяцам
  const by_method_and_month = Object.entries(methodMonthMap).map(([key, data]) => {
    const [month, methodCode] = key.split('_');
    const methodInfo = (methods as any[]).find((m: any) => m.code === methodCode);
    const methodName = methodInfo?.name || methodCode;

    return {
      month,
      method_id: methodCode,
      method_name: methodName,
      registration_count: data.count,
      total_sum: data.sum,
    };
  });

  by_method_and_month.sort((a, b) => {
    const monthCompare = a.month.localeCompare(b.month);
    if (monthCompare !== 0) return monthCompare;
    return b.registration_count - a.registration_count;
  });

  const result: RegistrationStatsResult = {
    by_method,
    by_month,
    by_method_and_month,
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
