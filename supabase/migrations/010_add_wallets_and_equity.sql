-- Add Wallets and Equity Account Type
-- This migration adds wallet functionality and equity account type

-- Add is_wallet column to chart_of_accounts
ALTER TABLE chart_of_accounts 
ADD COLUMN IF NOT EXISTS is_wallet BOOLEAN NOT NULL DEFAULT false;

-- Update account type constraint to include 'equity'
ALTER TABLE chart_of_accounts 
DROP CONSTRAINT IF EXISTS chart_of_accounts_type_check;

ALTER TABLE chart_of_accounts 
ADD CONSTRAINT chart_of_accounts_type_check 
CHECK (type IN ('asset', 'liability', 'income', 'expense', 'equity'));

-- Add constraint: is_wallet can only be true for asset accounts
ALTER TABLE chart_of_accounts 
ADD CONSTRAINT chart_of_accounts_wallet_check 
CHECK (is_wallet = false OR type = 'asset');

-- Create index on is_wallet for performance
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_is_wallet 
ON chart_of_accounts(is_wallet) 
WHERE is_wallet = true;

-- Add comment
COMMENT ON COLUMN chart_of_accounts.is_wallet IS 'Indicates if this asset account is a wallet account';





