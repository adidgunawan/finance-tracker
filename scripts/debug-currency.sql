-- Check what currencies are stored in transactions
SELECT 
  id,
  transaction_date,
  type,
  description,
  amount,
  currency,
  created_at
FROM transactions
WHERE user_id = (SELECT id FROM "user" LIMIT 1)
ORDER BY transaction_date DESC, created_at DESC
LIMIT 20;

-- Check account currencies
SELECT 
  id,
  name,
  type,
  currency,
  is_active
FROM chart_of_accounts
WHERE user_id = (SELECT id FROM "user" LIMIT 1)
  AND type = 'asset'
ORDER BY name;

-- Check for currency mismatches
SELECT 
  t.id,
  t.description,
  t.type,
  t.amount,
  t.currency as transaction_currency,
  a.name as account_name,
  a.currency as account_currency,
  CASE 
    WHEN t.currency != a.currency THEN 'MISMATCH'
    ELSE 'OK'
  END as currency_match
FROM transactions t
JOIN transaction_lines tl ON t.id = tl.transaction_id
JOIN chart_of_accounts a ON tl.account_id = a.id
WHERE t.user_id = (SELECT id FROM "user" LIMIT 1)
  AND t.transaction_date >= '2026-01-01'
ORDER BY t.transaction_date DESC;
