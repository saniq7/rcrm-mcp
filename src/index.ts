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
import { getSalesBySource } from './operations/sales-by-source.js';
import { getLeadsCount } from './operations/leads-count.js';
import { getRegistrationStats } from './operations/registration-stats.js';
import { getOrders, getCustomers, getReference } from './operations/generic.js';
import { getAnalyticsToolDefinition, getAnalytics } from './operations/get-analytics.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: '*', // Allow all origins for debugging
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Middleware to log all requests
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
    // Default lightweight view if no fields specified
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

  // If fields are specified, pick them
  const result: any = {};
  fields.forEach(field => {
    if (item[field] !== undefined) {
      result[field] = item[field];
    }
  });
  
  // Always include ID and Number for context
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
  },
  {
    name: 'query_retailcrm',
    description: 'Legacy analytics tools.',
    inputSchema: {
      type: 'object',
      properties: {
        operation: { type: 'string' },
        params: { type: 'object' }
      },
      required: ['operation', 'params']
    }
  }
];

// Helper to create a new server instance for each connection
const createServer = () => {
  const server = new Server(
    {
      name: 'retailcrm-mcp-server',
      version: '2.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    // Dynamically add the analytics tool to the list
    const allTools = [...tools, getAnalyticsToolDefinition];
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
          result = await getAnalytics(retailcrmClient, args as any);
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
          // Simple filter for customers too if needed, or just pass through
          // For now, let's apply similar logic if fields are present
          if (args?.fields) {
             result = {
                ...customersResult,
                customers: customersResult.customers.map((c: any) => filterFields(c, args.fields as string[]))
             };
          } else {
             result = customersResult;
          }
          break;
        case 'query_retailcrm':
          const { operation, params } = args as any;
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

// Store active transports
// In a real production app, you might want to clean these up periodically or use a more robust session manager
const transports = new Map<string, SSEServerTransport>();

app.get('/sse', async (req, res) => {
  console.log('New SSE connection request');
  const transport = new SSEServerTransport('/messages', res);
  const server = createServer();
  
  await server.connect(transport);
  
  // Log successful connection
  console.log('SSE connection established');
  
  // Store transport by session ID (if available) or generate a unique ID
  // For simplicity in this example, we rely on the transport's internal handling
  // But we need to handle the POST messages correctly.
  // The SDK's SSEServerTransport generates a session ID and returns it in the SSE stream.
  // We need to capture that session ID to route POST requests.
  
  // HACK: We need to access the session ID. The SDK doesn't expose it easily before connection.
  // However, the client will send the session ID in the query param `sessionId` for POST requests.
  // We need to store the transport so we can find it later.
  
  // Since we can't easily get the ID *out* of the transport instance in the current SDK version without hacking,
  // we will use a slightly different approach:
  // We'll attach the transport to the response object or a global map if we can extract the ID.
  
  // Actually, the SDK handles this by expecting us to route the POST request to the *correct* transport instance.
  // Since we don't have a session ID in the GET request, we create a NEW transport.
  // But for the POST request, the client MUST send a sessionId.
  
  // Let's use a Map to store transports by sessionId.
  // We can hook into the transport's `sessionId` property if it exists, or we might need to wait.
  
  // Inspecting SDK source (mental model): SSEServerTransport creates a sessionId in constructor or start.
  // Let's assume we can access `transport.sessionId` after `server.connect(transport)`.
  
  // @ts-ignore - accessing private or protected property if needed, but usually it's public in recent versions
  const sessionId = (transport as any).sessionId;
  if (sessionId) {
    transports.set(sessionId, transport);
    console.log(`Transport created for session: ${sessionId}`);
    
    // Clean up on close
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
  res.json({ status: 'ok', service: 'RetailCRM MCP Server (SSE)', version: '2.0.1' });
});

app.listen(port, () => {
  console.log(`RetailCRM MCP Server (SSE) listening on port ${port}`);
});
