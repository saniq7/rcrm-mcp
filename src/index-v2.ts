import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { RetailCRMClient } from './retailcrm/api-client.js';
import { getOrders, getCustomers, getReference } from './operations/generic.js';
import { getAnalyticsV2ToolDefinition, getAnalyticsV2 } from './operations/get-analytics-v2.js';
import { getOrderHistoryToolDefinition, getOrderHistory } from './operations/get-order-history.js';
import { syncDataToolDefinition, syncData } from './operations/sync-data.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Initialize RetailCRM client
const retailcrmClient = new RetailCRMClient({
  baseUrl: process.env.RETAILCRM_URL || 'https://demo.retailcrm.ru',
  apiKey: process.env.RETAILCRM_API_KEY || '',
});

// Helper to filter object fields
function filterFields(item: any, fields?: string[]): any {
  if (!fields || fields.length === 0) {
    return {
      id: item.id,
      number: item.number,
      createdAt: item.createdAt,
      status: item.status,
      sum: item.sum,
      totalSumm: item.totalSumm,
      customer: item.customer ? { id: item.customer.id, externalId: item.customer.externalId } : undefined
    };
  }

  const result: any = {};
  fields.forEach(field => {
    if (item[field] !== undefined) {
      result[field] = item[field];
    }
  });
  
  result.id = item.id;
  if (item.number) result.number = item.number;
  
  return result;
}

// Define Tools
const tools: Tool[] = [
  {
    name: 'get_reference',
    description: 'Retrieve metadata and dictionaries from RetailCRM (e.g., custom fields, statuses).',
    inputSchema: {
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
    description: 'Search and retrieve orders with flexible filtering. Supports filtering by date (createdAtFrom, createdAtTo), status, customer, etc.',
    inputSchema: {
      type: 'object',
      properties: {
        filter: { 
          type: 'object',
          description: 'Filter parameters for orders. Common fields: createdAtFrom (YYYY-MM-DD HH:mm:ss), createdAtTo (YYYY-MM-DD HH:mm:ss), status, customerId, managerId.',
          properties: {
            createdAtFrom: { type: 'string', description: 'Start date (YYYY-MM-DD HH:mm:ss)' },
            createdAtTo: { type: 'string', description: 'End date (YYYY-MM-DD HH:mm:ss)' },
            status: { type: 'string' },
            numbers: { type: 'array', items: { type: 'string' } }
          }
        },
        limit: { type: 'number', description: 'Number of items per page (20, 50, 100)' },
        page: { type: 'number', description: 'Page number' },
        fields: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'List of fields to return. If empty, returns simplified object (id, number, status, sum, date). Use ["items", "customer", "delivery"] for details.'
        }
      }
    }
  },
  {
    name: 'get_customers',
    description: 'Search and retrieve customers with flexible filtering.',
    inputSchema: {
      type: 'object',
      properties: {
        filter: { type: 'object' },
        limit: { type: 'number' },
        page: { type: 'number' }
      }
    }
  }
];

// Helper to create a new server instance for each connection
const createServer = () => {
  const server = new Server(
    {
      name: 'retailcrm-mcp-server-v2',
      version: '2.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const allTools = [
      ...tools, 
      getAnalyticsV2ToolDefinition, 
      getOrderHistoryToolDefinition,
      syncDataToolDefinition
    ];
    return { tools: allTools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result: any;

      switch (name) {
        case 'get_reference':
          result = await getReference(retailcrmClient, args);
          break;
        case 'get_analytics':
          result = await getAnalyticsV2(retailcrmClient, args as any);
          break;
        case 'get_order_history':
          result = await getOrderHistory(retailcrmClient, args as any);
          break;
        case 'sync_data':
          result = await syncData(retailcrmClient, args as any);
          break;
        case 'get_orders':
          const ordersResult = await getOrders(retailcrmClient, args);
          result = {
            ...ordersResult,
            orders: ordersResult.orders.map((o: any) => filterFields(o, args?.fields as string[]))
          };
          break;
        case 'get_customers':
          const customersResult = await getCustomers(retailcrmClient, args);
          if (args?.fields) {
             result = {
                ...customersResult,
                customers: customersResult.customers.map((c: any) => filterFields(c, args.fields as string[]))
             };
          } else {
             result = customersResult;
          }
          break;
        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: `Error: ${errorMessage}` }],
        isError: true,
      };
    }
  });

  return server;
};

const transports = new Map<string, SSEServerTransport>();

app.get('/sse', async (req, res) => {
  console.log('New SSE connection request');
  const transport = new SSEServerTransport('/messages', res);
  const server = createServer();
  
  await server.connect(transport);
  
  console.log('SSE connection established');
  
  // @ts-ignore
  const sessionId = (transport as any).sessionId;
  if (sessionId) {
    transports.set(sessionId, transport);
    console.log(`Transport created for session: ${sessionId}`);
    
    res.on('close', () => {
      console.log(`SSE connection closed for session: ${sessionId}`);
      transports.delete(sessionId);
    });
  }
});

app.post('/messages', async (req, res) => {
  const sessionId = req.query.sessionId as string;
  console.log(`Received message for session: ${sessionId}`);
  
  if (!sessionId) {
    res.status(400).json({ error: 'Missing sessionId query parameter' });
    return;
  }

  const transport = transports.get(sessionId);
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    console.log(`Session not found: ${sessionId}`);
    res.status(404).json({ error: 'Session not found' });
  }
});

app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'RetailCRM MCP Server V2 (with DB caching)', 
    version: '2.0.0',
    features: ['database_caching', 'incremental_sync', 'fast_analytics']
  });
});

app.listen(port, () => {
  console.log(`RetailCRM MCP Server V2 listening on port ${port}`);
  console.log(`Database caching: ${process.env.SUPABASE_URL ? 'ENABLED' : 'DISABLED'}`);
});
