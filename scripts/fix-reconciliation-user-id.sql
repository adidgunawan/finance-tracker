-- Quick fix script for reconciliation_sessions user_id column
-- Run this directly in your database to fix the UUID issue

-- Step 1: Drop the foreign key constraint
ALTER TABLE reconciliation_sessions DROP CONSTRAINT IF EXISTS reconciliation_sessions_user_id_fkey;

-- Step 2: Drop the matches table first (due to foreign key)
DROP TABLE IF EXISTS reconciliation_matches CASCADE;

-- Step 3: Drop and recreate the sessions table with correct user_id type
DROP TABLE IF EXISTS reconciliation_sessions CASCADE;

-- Step 4: Recreate with correct types
CREATE TABLE reconciliation_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  parsed_data JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed')) DEFAULT 'in_progress',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reconciliation_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES reconciliation_sessions(id) ON DELETE CASCADE,
  csv_row_index INTEGER NOT NULL,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  match_type TEXT NOT NULL CHECK (match_type IN ('auto', 'manual', 'none')) DEFAULT 'none',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, csv_row_index)
);

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_reconciliation_sessions_user_id ON reconciliation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_sessions_account_id ON reconciliation_sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_sessions_status ON reconciliation_sessions(status);
CREATE INDEX IF NOT EXISTS idx_reconciliation_matches_session_id ON reconciliation_matches(session_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_matches_transaction_id ON reconciliation_matches(transaction_id);

