-- Create exchange_rates table for caching currency conversion rates
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  base_currency TEXT NOT NULL,
  target_currency TEXT NOT NULL,
  rate NUMERIC(20, 10) NOT NULL,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Composite unique constraint to prevent duplicate currency pairs
  UNIQUE(base_currency, target_currency)
);

-- Create indexes for faster lookups
CREATE INDEX idx_exchange_rates_currencies ON exchange_rates(base_currency, target_currency);
CREATE INDEX idx_exchange_rates_fetched_at ON exchange_rates(fetched_at);

-- Enable Row Level Security
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read exchange rates
CREATE POLICY "Allow authenticated users to read exchange rates"
  ON exchange_rates FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can insert/update exchange rates (via backend API calls)
CREATE POLICY "Allow service role to manage exchange rates"
  ON exchange_rates FOR ALL
  TO service_role
  USING (true);

-- Add helpful comment
COMMENT ON TABLE exchange_rates IS 'Caches exchange rates from external API to reduce API calls and improve performance';
