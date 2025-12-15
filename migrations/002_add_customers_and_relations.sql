-- Migration: Add customers table and improve schema
-- Purpose: Store customers with tags and establish proper relations with orders

-- Drop old materialized view (too specific for one use case)
DROP MATERIALIZED VIEW IF EXISTS monthly_registrations;
DROP FUNCTION IF EXISTS refresh_monthly_registrations();

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY,
    external_id VARCHAR(100),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL,
    vip BOOLEAN DEFAULT FALSE,
    bad BOOLEAN DEFAULT FALSE,
    tags JSONB DEFAULT '[]'::jsonb,
    custom_fields JSONB,
    ltv DECIMAL(10, 2),
    average_check DECIMAL(10, 2),
    orders_count INTEGER DEFAULT 0,
    raw_data JSONB,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Create indexes for customers
CREATE INDEX idx_customers_created_at ON customers (created_at);
CREATE INDEX idx_customers_email ON customers (email);
CREATE INDEX idx_customers_phone ON customers (phone);
CREATE INDEX idx_customers_vip ON customers (vip);
CREATE INDEX idx_customers_tags ON customers USING GIN (tags);
CREATE INDEX idx_customers_custom_fields ON customers USING GIN (custom_fields);

-- Add foreign key constraint to orders table
ALTER TABLE orders 
ADD CONSTRAINT fk_orders_customer 
FOREIGN KEY (customer_id) 
REFERENCES customers(id) 
ON DELETE SET NULL;

-- Create index on foreign key
CREATE INDEX idx_orders_customer_fk ON orders (customer_id);

-- Create analytics cache table (for future optimization)
CREATE TABLE IF NOT EXISTS analytics_cache (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    query_params JSONB NOT NULL,
    result JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Create index on cache expiration
CREATE INDEX idx_analytics_cache_expires ON analytics_cache (expires_at);
CREATE INDEX idx_analytics_cache_key ON analytics_cache (cache_key);

-- Update sync_metadata to track both orders and customers
ALTER TABLE sync_metadata 
ADD COLUMN IF NOT EXISTS last_customer_sync_timestamp TIMESTAMPTZ DEFAULT '2020-01-01 00:00:00'::TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS customers_synced INTEGER DEFAULT 0;

-- Create function to clean expired cache
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM analytics_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE customers IS 'Cached customers from RetailCRM API with tags and custom fields';
COMMENT ON TABLE analytics_cache IS 'Cache for pre-computed analytics queries (TTL-based)';
COMMENT ON COLUMN customers.tags IS 'Array of customer tags (e.g., ["VIP", "Wholesale"])';
COMMENT ON COLUMN customers.custom_fields IS 'Custom fields specific to this RetailCRM instance';
COMMENT ON COLUMN orders.customer_id IS 'Foreign key to customers table';
