import dotenv from 'dotenv';
import { RetailCRMClient } from './src/retailcrm/api-client.js';
import { getAnalytics } from './src/operations/get-analytics.js';

dotenv.config();

async function runTest() {
  const client = new RetailCRMClient({
    baseUrl: process.env.RETAILCRM_URL || '',
    apiKey: process.env.RETAILCRM_API_KEY || '',
  });

  console.log('--- Testing get_analytics ---');
  const args = {
    dateFrom: '2024-09-01',
    dateTo: '2024-12-13',
    groupBy: 'week' as const,
    splitBy: 'source.source',
    filter: {
      customFields: {
        'adress_client': 'exists' // Assuming this is the code for "адрес crm"
      }
    }
  };

  console.log('Arguments:', JSON.stringify(args, null, 2));

  const startTime = Date.now();
  try {
    const result = await getAnalytics(client, args);
    const duration = Date.now() - startTime;

    console.log(`\nExecution Time: ${duration}ms`);
    console.log('Result Meta:', JSON.stringify(result.meta, null, 2));
    console.log('First 3 Data Points:', JSON.stringify(result.analytics.slice(0, 3), null, 2));
    console.log('Total Data Points:', result.analytics.length);
    
    // Check payload size
    const jsonSize = JSON.stringify(result).length;
    console.log(`Payload Size: ${(jsonSize / 1024).toFixed(2)} KB`);

  } catch (error) {
    console.error('Error:', error);
  }
}

runTest();
