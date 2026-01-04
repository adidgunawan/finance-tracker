-- Authorized Users Table
-- This table stores whitelisted email addresses that are allowed to access the application
CREATE TABLE IF NOT EXISTS authorized_users (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on email for fast lookups
CREATE INDEX IF NOT EXISTS idx_authorized_users_email ON authorized_users(email);

-- Add comment to table
COMMENT ON TABLE authorized_users IS 'Whitelist of authorized user email addresses';



