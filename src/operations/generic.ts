import { RetailCRMClient } from '../retailcrm/api-client.js';

export async function getOrders(client: RetailCRMClient, params: any) {
  const { filter, limit, page } = params;
  return await client.getOrders(filter, limit, page);
}

export async function getCustomers(client: RetailCRMClient, params: any) {
  const { filter, limit, page } = params;
  return await client.getCustomers(filter, limit, page);
}

export async function getReference(client: RetailCRMClient, params: any) {
  const { dictionary } = params;
  if (!dictionary) {
    throw new Error('Parameter "dictionary" is required');
  }
  return await client.getReference(dictionary);
}
