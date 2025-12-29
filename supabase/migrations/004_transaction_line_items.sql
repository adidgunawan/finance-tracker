-- Transaction Line Items
-- Allows splitting a single transaction into multiple items (e.g., grocery items, income sources)
CREATE TABLE transaction_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  expense_account_id UUID REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  income_account_id UUID REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  quantity NUMERIC(10, 2),
  unit_price NUMERIC(15, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT expense_or_income_account CHECK (
    (expense_account_id IS NOT NULL AND income_account_id IS NULL) OR
    (expense_account_id IS NULL AND income_account_id IS NOT NULL)
  )
);

-- Index for faster lookups
CREATE INDEX idx_transaction_line_items_transaction_id ON transaction_line_items(transaction_id);
CREATE INDEX idx_transaction_line_items_expense_account_id ON transaction_line_items(expense_account_id);
CREATE INDEX idx_transaction_line_items_income_account_id ON transaction_line_items(income_account_id);

-- Enable RLS
ALTER TABLE transaction_line_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transaction_line_items
-- Note: Since user_id is TEXT (better-auth), we cast auth.uid() to TEXT
CREATE POLICY "Users can view own transaction line items" ON transaction_line_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = transaction_line_items.transaction_id
      AND transactions.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert own transaction line items" ON transaction_line_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = transaction_line_items.transaction_id
      AND transactions.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can update own transaction line items" ON transaction_line_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = transaction_line_items.transaction_id
      AND transactions.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete own transaction line items" ON transaction_line_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = transaction_line_items.transaction_id
      AND transactions.user_id = auth.uid()::text
    )
  );

