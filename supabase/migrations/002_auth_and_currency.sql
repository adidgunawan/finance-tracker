-- Drop RLS policies that depend on auth.uid() or user_id type
DROP POLICY IF EXISTS "Users can view own accounts" ON chart_of_accounts;
DROP POLICY IF EXISTS "Users can insert own accounts" ON chart_of_accounts;
DROP POLICY IF EXISTS "Users can update own accounts" ON chart_of_accounts;
DROP POLICY IF EXISTS "Users can delete own accounts" ON chart_of_accounts;

DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;

DROP POLICY IF EXISTS "Users can view own transaction lines" ON transaction_lines;
DROP POLICY IF EXISTS "Users can insert own transaction lines" ON transaction_lines;
DROP POLICY IF EXISTS "Users can delete own transaction lines" ON transaction_lines;

DROP POLICY IF EXISTS "Users can view own tags" ON transaction_tags;
DROP POLICY IF EXISTS "Users can insert own tags" ON transaction_tags;
DROP POLICY IF EXISTS "Users can update own tags" ON transaction_tags;
DROP POLICY IF EXISTS "Users can delete own tags" ON transaction_tags;

DROP POLICY IF EXISTS "Users can view own tag relations" ON transaction_tag_relations;
DROP POLICY IF EXISTS "Users can insert own tag relations" ON transaction_tag_relations;
DROP POLICY IF EXISTS "Users can delete own tag relations" ON transaction_tag_relations;

DROP POLICY IF EXISTS "Users can view own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can insert own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can update own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can delete own budgets" ON budgets;

DROP POLICY IF EXISTS "Users can view own budget amounts" ON budget_monthly_amounts;
DROP POLICY IF EXISTS "Users can insert own budget amounts" ON budget_monthly_amounts;
DROP POLICY IF EXISTS "Users can update own budget amounts" ON budget_monthly_amounts;
DROP POLICY IF EXISTS "Users can delete own budget amounts" ON budget_monthly_amounts;

-- Drop foreign keys linking to auth.users
ALTER TABLE chart_of_accounts DROP CONSTRAINT IF EXISTS chart_of_accounts_user_id_fkey;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;
ALTER TABLE transaction_tags DROP CONSTRAINT IF EXISTS transaction_tags_user_id_fkey;
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_user_id_fkey;

-- Better Auth schema
CREATE TABLE IF NOT EXISTS "user" (
    id TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    emailVerified BOOLEAN NOT NULL,
    image TEXT,
    createdAt TIMESTAMP NOT NULL,
    updatedAt TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "session" (
    id TEXT NOT NULL PRIMARY KEY,
    userId TEXT NOT NULL REFERENCES "user"(id),
    token TEXT NOT NULL UNIQUE,
    expiresAt TIMESTAMP NOT NULL,
    ipAddress TEXT,
    userAgent TEXT,
    createdAt TIMESTAMP NOT NULL,
    updatedAt TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "account" (
    id TEXT NOT NULL PRIMARY KEY,
    userId TEXT NOT NULL REFERENCES "user"(id),
    accountId TEXT NOT NULL,
    providerId TEXT NOT NULL,
    accessToken TEXT,
    refreshToken TEXT,
    accessTokenExpiresAt TIMESTAMP,
    refreshTokenExpiresAt TIMESTAMP,
    scope TEXT,
    idToken TEXT,
    password TEXT,
    createdAt TIMESTAMP NOT NULL,
    updatedAt TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "verification" (
    id TEXT NOT NULL PRIMARY KEY,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    expiresAt TIMESTAMP NOT NULL,
    createdAt TIMESTAMP NOT NULL,
    updatedAt TIMESTAMP NOT NULL
);

-- Settings & Currency
CREATE TABLE IF NOT EXISTS settings (
  user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  default_currency TEXT NOT NULL DEFAULT 'USD',
  theme TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Update column types and add new columns
ALTER TABLE chart_of_accounts ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
    
ALTER TABLE transactions ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(10, 6) DEFAULT 1.0;

ALTER TABLE transaction_tags ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE budgets ALTER COLUMN user_id TYPE TEXT;

-- Re-establish FKs to new user table
ALTER TABLE chart_of_accounts ADD CONSTRAINT chart_of_accounts_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;

ALTER TABLE transactions ADD CONSTRAINT transactions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;

ALTER TABLE transaction_tags ADD CONSTRAINT transaction_tags_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;

ALTER TABLE budgets ADD CONSTRAINT budgets_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;
