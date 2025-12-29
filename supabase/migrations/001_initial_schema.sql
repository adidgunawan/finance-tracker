-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Chart of Accounts
CREATE TABLE chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('asset', 'liability', 'income', 'expense')),
  parent_id UUID REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  level INTEGER NOT NULL CHECK (level >= 1 AND level <= 3),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_hierarchy CHECK (
    (level = 1 AND parent_id IS NULL) OR
    (level > 1 AND parent_id IS NOT NULL)
  )
);

-- Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  transaction_id TEXT,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  description TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  payee_payer TEXT,
  attachment_filename TEXT,
  attachment_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transaction Lines (Double-Entry)
CREATE TABLE transaction_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  debit_amount NUMERIC(15, 2) CHECK (debit_amount >= 0),
  credit_amount NUMERIC(15, 2) CHECK (credit_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT debit_or_credit CHECK (
    (debit_amount IS NOT NULL AND credit_amount IS NULL) OR
    (debit_amount IS NULL AND credit_amount IS NOT NULL)
  )
);

-- Transaction Tags
CREATE TABLE transaction_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Transaction Tag Relations
CREATE TABLE transaction_tag_relations (
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES transaction_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (transaction_id, tag_id)
);

-- Budgets
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE CASCADE,
  budget_type TEXT NOT NULL CHECK (budget_type IN ('fixed_monthly', 'custom_monthly', 'date_range')),
  fixed_amount NUMERIC(15, 2) CHECK (fixed_amount >= 0),
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_budget_type CHECK (
    (budget_type = 'fixed_monthly' AND fixed_amount IS NOT NULL) OR
    (budget_type = 'custom_monthly') OR
    (budget_type = 'date_range' AND start_date IS NOT NULL AND end_date IS NOT NULL)
  )
);

-- Budget Monthly Amounts
CREATE TABLE budget_monthly_amounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
  UNIQUE(budget_id, year, month)
);

-- Indexes for performance
CREATE INDEX idx_coa_user_id ON chart_of_accounts(user_id);
CREATE INDEX idx_coa_parent_id ON chart_of_accounts(parent_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transaction_lines_transaction_id ON transaction_lines(transaction_id);
CREATE INDEX idx_transaction_lines_account_id ON transaction_lines(account_id);
CREATE INDEX idx_budgets_user_id ON budgets(user_id);
CREATE INDEX idx_budgets_account_id ON budgets(account_id);

-- Row Level Security (RLS)
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_tag_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_monthly_amounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chart_of_accounts
CREATE POLICY "Users can view own accounts" ON chart_of_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own accounts" ON chart_of_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own accounts" ON chart_of_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own accounts" ON chart_of_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for transactions
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" ON transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions" ON transactions
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for transaction_lines
CREATE POLICY "Users can view own transaction lines" ON transaction_lines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = transaction_lines.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own transaction lines" ON transaction_lines
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = transaction_lines.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own transaction lines" ON transaction_lines
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = transaction_lines.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );

-- RLS Policies for transaction_tags
CREATE POLICY "Users can view own tags" ON transaction_tags
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tags" ON transaction_tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tags" ON transaction_tags
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tags" ON transaction_tags
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for transaction_tag_relations
CREATE POLICY "Users can view own tag relations" ON transaction_tag_relations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = transaction_tag_relations.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own tag relations" ON transaction_tag_relations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = transaction_tag_relations.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own tag relations" ON transaction_tag_relations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = transaction_tag_relations.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );

-- RLS Policies for budgets
CREATE POLICY "Users can view own budgets" ON budgets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budgets" ON budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets" ON budgets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets" ON budgets
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for budget_monthly_amounts
CREATE POLICY "Users can view own budget amounts" ON budget_monthly_amounts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM budgets
      WHERE budgets.id = budget_monthly_amounts.budget_id
      AND budgets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own budget amounts" ON budget_monthly_amounts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM budgets
      WHERE budgets.id = budget_monthly_amounts.budget_id
      AND budgets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own budget amounts" ON budget_monthly_amounts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM budgets
      WHERE budgets.id = budget_monthly_amounts.budget_id
      AND budgets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own budget amounts" ON budget_monthly_amounts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM budgets
      WHERE budgets.id = budget_monthly_amounts.budget_id
      AND budgets.user_id = auth.uid()
    )
  );

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_chart_of_accounts_updated_at
  BEFORE UPDATE ON chart_of_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
