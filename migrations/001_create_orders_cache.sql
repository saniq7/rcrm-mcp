-- Migration: Create orders cache table with optimized indexes
-- Purpose: Store synced orders from RetailCRM API for fast analytics

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY,
    number VARCHAR(50),
    external_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(50),
    customer_id INTEGER,
    customer_external_id VARCHAR(100),
    total_summ DECIMAL(10, 2),
    sum_paid DECIMAL(10, 2),
    discount DECIMAL(10, 2),
    source_source VARCHAR(100),
    source_medium VARCHAR(100),
    source_campaign VARCHAR(100),
    site VARCHAR(50),
    manager_id INTEGER,
    custom_fields JSONB,
    raw_data JSONB,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Create indexes for fast filtering
CREATE INDEX idx_orders_created_at ON orders (created_at);
CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_customer_id ON orders (customer_id);
CREATE INDEX idx_orders_site ON orders (site);
CREATE INDEX idx_orders_manager_id ON orders (manager_id);

-- GIN index for JSONB custom fields (for existence checks)
CREATE INDEX idx_orders_custom_fields ON orders USING GIN (custom_fields);

-- Composite index for common analytics queries (time + status)
CREATE INDEX idx_orders_created_status ON orders (created_at, status);

-- Create materialized view for monthly registrations with address
CREATE MATERIALIZED VIEW monthly_registrations AS
SELECT 
    DATE_TRUNC('month', created_at) AS month,
    COUNT(*) AS total_count,
    SUM(total_summ) AS total_sum,
    COUNT(*) FILTER (WHERE custom_fields ? 'adress_client') AS with_address_count,
    SUM(total_summ) FILTER (WHERE custom_fields ? 'adress_client') AS with_address_sum
FROM orders
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month;

-- Create index on materialized view
CREATE UNIQUE INDEX idx_monthly_registrations_month ON monthly_registrations (month);

-- Create sync metadata table
CREATE TABLE IF NOT EXISTS sync_metadata (
    id SERIAL PRIMARY KEY,
    last_sync_timestamp TIMESTAMPTZ NOT NULL,
    last_order_id INTEGER,
    orders_synced INTEGER DEFAULT 0,
    sync_duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial sync metadata
INSERT INTO sync_metadata (last_sync_timestamp, orders_synced)
VALUES ('2020-01-01 00:00:00'::TIMESTAMPTZ, 0);

-- Create function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_monthly_registrations()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_registrations;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE orders IS 'Cached orders from RetailCRM API for fast analytics';
COMMENT ON TABLE sync_metadata IS 'Tracks last sync timestamp for incremental updates';
COMMENT ON MATERIALIZED VIEW monthly_registrations IS 'Pre-aggregated monthly registration statistics';
