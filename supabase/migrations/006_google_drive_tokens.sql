-- Google Drive OAuth Tokens
-- Stores OAuth tokens for users to upload files to their own Google Drive
CREATE TABLE IF NOT EXISTS google_drive_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_google_drive_tokens_user_id ON google_drive_tokens(user_id);

-- Enable RLS
ALTER TABLE google_drive_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own Google Drive tokens" ON google_drive_tokens;
DROP POLICY IF EXISTS "Users can insert own Google Drive tokens" ON google_drive_tokens;
DROP POLICY IF EXISTS "Users can update own Google Drive tokens" ON google_drive_tokens;
DROP POLICY IF EXISTS "Users can delete own Google Drive tokens" ON google_drive_tokens;

-- RLS Policies for google_drive_tokens
-- Users can only access their own tokens
CREATE POLICY "Users can view own Google Drive tokens" ON google_drive_tokens
  FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert own Google Drive tokens" ON google_drive_tokens
  FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update own Google Drive tokens" ON google_drive_tokens
  FOR UPDATE
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can delete own Google Drive tokens" ON google_drive_tokens
  FOR DELETE
  USING (user_id = auth.uid()::text);


