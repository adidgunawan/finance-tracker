-- Transaction Attachments
-- Allows multiple file attachments (images/PDFs) per transaction stored in Google Drive

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS transaction_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size > 0),
  drive_file_id TEXT NOT NULL UNIQUE,
  drive_web_view_link TEXT NOT NULL,
  drive_download_link TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- If table already exists, make transaction_id nullable (for temporary uploads)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'transaction_attachments' 
             AND column_name = 'transaction_id' 
             AND is_nullable = 'NO') THEN
    ALTER TABLE transaction_attachments ALTER COLUMN transaction_id DROP NOT NULL;
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_transaction_attachments_transaction_id ON transaction_attachments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_attachments_drive_file_id ON transaction_attachments(drive_file_id);

-- Enable RLS
ALTER TABLE transaction_attachments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running migration)
DROP POLICY IF EXISTS "Users can view own transaction attachments" ON transaction_attachments;
DROP POLICY IF EXISTS "Users can insert own transaction attachments" ON transaction_attachments;
DROP POLICY IF EXISTS "Users can update own transaction attachments" ON transaction_attachments;
DROP POLICY IF EXISTS "Users can delete own transaction attachments" ON transaction_attachments;

-- RLS Policies for transaction_attachments
-- Users can only access attachments for their own transactions
CREATE POLICY "Users can view own transaction attachments" ON transaction_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = transaction_attachments.transaction_id
      AND transactions.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert own transaction attachments" ON transaction_attachments
  FOR INSERT
  WITH CHECK (
    transaction_id IS NULL OR EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = transaction_attachments.transaction_id
      AND transactions.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can update own transaction attachments" ON transaction_attachments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = transaction_attachments.transaction_id
      AND transactions.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete own transaction attachments" ON transaction_attachments
  FOR DELETE
  USING (
    transaction_id IS NULL OR EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = transaction_attachments.transaction_id
      AND transactions.user_id = auth.uid()::text
    )
  );


