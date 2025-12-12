# RetailCRM MCP Server v2.0

A Model Context Protocol (MCP) server for RetailCRM (Simla), enabling AI agents to interact with your CRM data.

## Features

*   **Generic Tools**: Flexible access to orders and customers with full filtering support.
*   **Metadata Discovery**: Inspect custom fields, statuses, and other dictionaries on the fly.
*   **Legacy Support**: Specific analytics tools (`get_sales_by_source`, etc.) are preserved.
*   **Docker Ready**: Easy deployment with Docker Compose.

## Tools

### 1. `get_reference`
Retrieves metadata and dictionaries. Essential for discovering codes for filters.
*   **dictionary**: `custom-fields`, `statuses`, `order-types`, `sites`, `payment-types`, `delivery-types`, `order-methods`.

### 2. `get_orders`
Search and retrieve orders.
*   **filter**: JSON object matching RetailCRM API filter (e.g., `{ "createdAtFrom": "2025-01-01", "customFields": { "shoe_size": "42" } }`).
*   **limit**: Max records (default 20).
*   **page**: Page number.

### 3. `get_customers`
Search and retrieve customers.
*   **filter**: JSON object matching RetailCRM API filter.
*   **limit**: Max records (default 20).
*   **page**: Page number.

### 4. `query_retailcrm` (Legacy)
*   **operation**: `get_sales_by_source`, `get_leads_count`, `get_registration_stats`.

## Quick Start

1.  Clone the repository.
2.  Copy `.env.example` to `.env` and set your RetailCRM URL and API Key.
3.  Run `docker-compose up -d`.

## Integration

### n8n
Use the "HTTP Request" node to call the MCP server or use the AI Agent node with custom tools definition.

### Manus / Claude Desktop
Add to your configuration:
```json
{
  "mcpServers": {
    "retailcrm": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "--env-file", ".env", "retailcrm-mcp"]
    }
  }
}
```

## Examples

### Discover Custom Fields
```json
{
  "name": "get_reference",
  "arguments": {
    "dictionary": "custom-fields"
  }
}
```

### Search Orders by Custom Field
```json
{
  "name": "get_orders",
  "arguments": {
    "filter": {
      "customFields": {
        "shoe_size": "42"
      },
      "status": "new"
    }
  }
}
```
