import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { RetailCRMClient } from './retailcrm/api-client.js';
import { getSalesBySource } from './operations/sales-by-source.js';
import { getLeadsCount } from './operations/leads-count.js';
import { getRegistrationStats } from './operations/registration-stats.js';
import { getOrders, getCustomers, getReference } from './operations/generic.js';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize RetailCRM client
const retailcrmClient = new RetailCRMClient({
  baseUrl: process.env.RETAILCRM_URL || 'https://demo.retailcrm.ru',
  apiKey: process.env.RETAILCRM_API_KEY || '',
});

// Tool definitions (for documentation/discovery)
const tools = [
  {
    name: 'get_reference',
    description: 'Retrieve metadata and dictionaries from RetailCRM (e.g., custom fields, statuses).',
    parameters: {
      type: 'object',
      properties: {
        dictionary: {
          type: 'string',
          enum: ['custom-fields', 'statuses', 'order-types', 'sites', 'payment-types', 'delivery-types', 'order-methods'],
        }
      },
      required: ['dictionary']
    }
  },
  {
    name: 'get_orders',
    description: 'Search and retrieve orders with flexible filtering.',
    parameters: {
      type: 'object',
      properties: {
        filter: { type: 'object' },
        limit: { type: 'number' },
        page: { type: 'number' }
      }
    }
  },
  {
    name: 'get_customers',
    description: 'Search and retrieve customers with flexible filtering.',
    parameters: {
      type: 'object',
      properties: {
        filter: { type: 'object' },
        limit: { type: 'number' },
        page: { type: 'number' }
      }
    }
  },
  {
    name: 'query_retailcrm',
    description: 'Legacy analytics tools.',
    parameters: {
      type: 'object',
      properties: {
        operation: { type: 'string' },
        params: { type: 'object' }
      },
      required: ['operation', 'params']
    }
  }
];

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'RetailCRM MCP Server', 
    version: '2.0.0',
    tools: tools.map(t => t.name)
  });
});

// Main MCP Endpoint
app.post('/mcp', async (req, res) => {
  const { name, arguments: args } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Tool name is required' });
  }

  try {
    let result: any;

    switch (name) {
      case 'get_reference':
        result = await getReference(retailcrmClient, args);
        break;
      
      case 'get_orders':
        result = await getOrders(retailcrmClient, args);
        break;
        
      case 'get_customers':
        result = await getCustomers(retailcrmClient, args);
        break;

      case 'query_retailcrm':
        const { operation, params } = args;
        switch (operation) {
          case 'get_sales_by_source':
            result = await getSalesBySource(retailcrmClient, {
              date_from: params.date_from,
              date_to: params.date_to,
              source_id: params.source_id,
            });
            break;
          case 'get_leads_count':
            result = await getLeadsCount(retailcrmClient, {
              date_from: params.date_from,
              date_to: params.date_to,
            });
            break;
          case 'get_registration_stats':
            result = await getRegistrationStats(retailcrmClient, {
              date_from: params.date_from,
              date_to: params.date_to,
            });
            break;
          default:
            throw new Error(`Unknown operation: ${operation}`);
        }
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    res.json({ content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Execution error:', errorMessage);
    res.status(500).json({ 
      content: [{ type: 'text', text: `Error: ${errorMessage}` }],
      isError: true 
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`RetailCRM MCP Server listening on port ${port}`);
});
