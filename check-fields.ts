import dotenv from 'dotenv';
import { RetailCRMClient } from './src/retailcrm/api-client.js';
import { getReference } from './src/operations/generic.js';

dotenv.config();

async function checkFields() {
  const client = new RetailCRMClient({
    baseUrl: process.env.RETAILCRM_URL || '',
    apiKey: process.env.RETAILCRM_API_KEY || '',
  });

  try {
    const result = await getReference(client, { dictionary: 'custom-fields' });
    console.log('Custom Fields:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

checkFields();
