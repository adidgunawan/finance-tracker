-- Reconciliation Sessions Table
-- Stores reconciliation sessions for bank statement matching
CREATE TABLE IF NOT EXISTS reconciliation_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  parsed_data JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed')) DEFAULT 'in_progress',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- If table was created with UUID user_id, fix it
DO $$
BEGIN
  -- Check if user_id column is UUID type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reconciliation_sessions' 
    AND column_name = 'user_id' 
    AND data_type = 'uuid'
  ) THEN
    -- Drop foreign key constraint
    ALTER TABLE reconciliation_sessions DROP CONSTRAINT IF EXISTS reconciliation_sessions_user_id_fkey;
    -- Alter column to TEXT
    ALTER TABLE reconciliation_sessions ALTER COLUMN user_id TYPE TEXT;
    -- Re-add foreign key with correct reference
    ALTER TABLE reconciliation_sessions ADD CONSTRAINT reconciliation_sessions_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Reconciliation Matches Table
-- Stores individual matches between CSV rows and transactions
CREATE TABLE IF NOT EXISTS reconciliation_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES reconciliation_sessions(id) ON DELETE CASCADE,
  csv_row_index INTEGER NOT NULL,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  match_type TEXT NOT NULL CHECK (match_type IN ('auto', 'manual', 'none')) DEFAULT 'none',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, csv_row_index)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reconciliation_sessions_user_id ON reconciliation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_sessions_account_id ON reconciliation_sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_sessions_status ON reconciliation_sessions(status);
CREATE INDEX IF NOT EXISTS idx_reconciliation_matches_session_id ON reconciliation_matches(session_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_matches_transaction_id ON reconciliation_matches(transaction_id);

-- Add comments
COMMENT ON TABLE reconciliation_sessions IS 'Bank reconciliation sessions for matching CSV statements with transactions';
COMMENT ON TABLE reconciliation_matches IS 'Individual matches between CSV rows and transactions';
