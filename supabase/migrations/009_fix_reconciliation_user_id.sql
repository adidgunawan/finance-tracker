-- Fix reconciliation_sessions user_id column type
-- This migration fixes the user_id column from UUID to TEXT to match better-auth

-- Drop the foreign key constraint if it exists
ALTER TABLE reconciliation_sessions DROP CONSTRAINT IF EXISTS reconciliation_sessions_user_id_fkey;

-- Alter the column type from UUID to TEXT
-- Note: This will fail if there's existing data with UUID values
-- If you have existing data, you'll need to drop and recreate the table
DO $$
BEGIN
  -- Check if column exists and is UUID type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reconciliation_sessions' 
    AND column_name = 'user_id' 
    AND data_type = 'uuid'
  ) THEN
    -- If table has data, we need to drop it first (since UUID can't be cast to TEXT with invalid data)
    IF EXISTS (SELECT 1 FROM reconciliation_sessions LIMIT 1) THEN
      -- Table has data, drop it and recreate
      DROP TABLE IF EXISTS reconciliation_matches CASCADE;
      DROP TABLE IF EXISTS reconciliation_sessions CASCADE;
      
      -- Recreate with correct types
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
      
      -- Recreate indexes
      CREATE INDEX IF NOT EXISTS idx_reconciliation_sessions_user_id ON reconciliation_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_reconciliation_sessions_account_id ON reconciliation_sessions(account_id);
      CREATE INDEX IF NOT EXISTS idx_reconciliation_sessions_status ON reconciliation_sessions(status);
      CREATE INDEX IF NOT EXISTS idx_reconciliation_matches_session_id ON reconciliation_matches(session_id);
      CREATE INDEX IF NOT EXISTS idx_reconciliation_matches_transaction_id ON reconciliation_matches(transaction_id);
    ELSE
      -- Table is empty, just alter the column
      ALTER TABLE reconciliation_sessions ALTER COLUMN user_id TYPE TEXT;
      ALTER TABLE reconciliation_sessions ADD CONSTRAINT reconciliation_sessions_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Ensure the foreign key exists (in case table was created correctly but constraint is missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'reconciliation_sessions_user_id_fkey'
    AND table_name = 'reconciliation_sessions'
  ) THEN
    ALTER TABLE reconciliation_sessions ADD CONSTRAINT reconciliation_sessions_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;
  END IF;
END $$;






