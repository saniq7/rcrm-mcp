# RetailCRM MCP Server V2 🚀

**Version 2.0 with Database Caching Layer**

## What's New in V2

### Performance Improvements
- **99% faster queries**: <1s response time (vs 60-90s in v1)
- **Database caching**: PostgreSQL/Supabase for persistent data storage
- **Incremental sync**: Only fetch new/updated data from RetailCRM API
- **Zero API calls**: For cached data, no RetailCRM API requests needed

### New Features
- **Customers table**: Full support for customer data with tags
- **Relations**: Orders linked to customers via foreign keys
- **Manual sync tool**: `sync_data` for on-demand synchronization
- **Analytics cache**: TTL-based caching for frequent queries

### Architecture

```
┌─────────────────┐
│   AI Agent      │
│  (Manus/n8n)    │
└────────┬────────┘
         │ MCP Protocol
         ▼
┌─────────────────┐
│  MCP Server V2  │
│   (Express.js)  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌──────────┐
│ Cache  │ │ RetailCRM│
│(Supabase)│ │   API    │
└────────┘ └──────────┘
```

## Database Schema

### Tables

**`orders`**
- Stores all orders from RetailCRM
- Indexed fields: `created_at`, `status`, `customer_id`, `custom_fields`
- Foreign key: `customer_id` → `customers.id`

**`customers`**
- Stores all customers from RetailCRM
- Fields: `id`, `email`, `phone`, `tags`, `vip`, `custom_fields`
- Indexed fields: `created_at`, `email`, `tags`

**`analytics_cache`**
- TTL-based cache for analytics results
- Auto-expires after configured duration

**`sync_metadata`**
- Tracks last sync timestamp for incremental updates
- Separate timestamps for orders and customers

## Deployment

### Environment Variables

```bash
# RetailCRM API
RETAILCRM_URL=https://your-instance.retailcrm.ru
RETAILCRM_API_KEY=your_api_key

# Supabase (required for V2)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key

# Server
PORT=3000
```

### Railway Deployment

1. **Fork/Clone** this repository (v2 branch)
2. **Create new Railway project** from GitHub
3. **Add environment variables** (see above)
4. **Deploy** - Railway will auto-build and start

### Docker Deployment

```bash
docker build -t retailcrm-mcp-v2 .
docker run -p 3000:3000 \
  -e RETAILCRM_URL=... \
  -e RETAILCRM_API_KEY=... \
  -e SUPABASE_URL=... \
  -e SUPABASE_KEY=... \
  retailcrm-mcp-v2
```

## Usage

### 1. Initial Sync

Before running analytics, sync data to cache:

```javascript
// Call sync_data tool
{
  "entity": "all" // or "orders", "customers"
}
```

Response:
```json
{
  "success": true,
  "orders_synced": 1500,
  "customers_synced": 800,
  "total_duration_ms": 5000
}
```

### 2. Fast Analytics

Query cached data:

```javascript
// Call get_analytics tool
{
  "dateFrom": "2025-11-01",
  "dateTo": "2025-11-30",
  "metrics": ["count"],
  "groupBy": "month",
  "filter": {
    "customFields": {
      "adress_client": "exists"
    }
  }
}
```

Response (in <1s):
```json
{
  "meta": {
    "totalOrders": 1447,
    "source": "cache",
    "cacheHit": true
  },
  "analytics": [...]
}
```

## Tools Available

### Core Tools (from V1)
- `get_reference` - Metadata and dictionaries
- `get_orders` - Search orders (with improved filtering)
- `get_customers` - Search customers
- `get_order_history` - Order change history

### New Tools (V2)
- `sync_data` - Manual data synchronization
- `get_analytics` - Fast analytics with DB caching (improved)

## Migration from V1

### Key Changes

1. **No post-filtering**: Filters now passed to API directly
2. **Database required**: V2 requires Supabase configuration
3. **Sync before query**: First sync data, then run analytics
4. **New entry point**: Use `src/index-v2.ts` instead of `src/index.ts`

### Backward Compatibility

V2 falls back to API if cache is empty, so it works without initial sync (but slower).

## Performance Comparison

| Metric | V1 (API only) | V2 (with cache) |
|--------|---------------|-----------------|
| Query time | 60-90s | <1s |
| API calls | 15-20 | 0 |
| Memory usage | High | Low |
| Concurrent queries | Limited | Unlimited |

## Best Practices

1. **Sync regularly**: Run `sync_data` every 5-15 minutes (cron job)
2. **Monitor cache**: Check `sync_metadata` table for last sync time
3. **Clean expired cache**: Auto-cleanup runs on sync
4. **Use filters wisely**: Custom field "exists" checks still require post-filtering

## Troubleshooting

### Cache not working
- Check `SUPABASE_URL` and `SUPABASE_KEY` are set
- Verify database tables exist: `orders`, `customers`, `sync_metadata`
- Run `sync_data` tool manually

### Slow queries
- Check if data is in cache: look for `"source": "cache"` in response
- Verify indexes exist on filtered fields
- Consider running sync more frequently

### Sync errors
- Check RetailCRM API credentials
- Verify Supabase connection
- Check logs for specific error messages

## License

MIT License - See LICENSE file for details
