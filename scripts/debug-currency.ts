/**
 * Debug script to check currency data in database
 * Run this to see what currencies are actually stored
 */

import { createAdminClient } from '../src/lib/supabase/admin';

async function debugCurrencyData() {
  const supabase = createAdminClient();

  console.log('\n=== CHECKING TRANSACTION CURRENCIES ===\n');
  
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('id, transaction_date, type, description, amount, currency, created_at')
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(20);

  if (txError) {
    console.error('Error fetching transactions:', txError);
  } else {
    console.table(transactions);
  }

  console.log('\n=== CHECKING ACCOUNT CURRENCIES ===\n');

  const { data: accounts, error: accError } = await supabase
    .from('chart_of_accounts')
    .select('id, name, type, currency, is_active')
    .eq('type', 'asset')
    .order('name');

  if (accError) {
    console.error('Error fetching accounts:', accError);
  } else {
    console.table(accounts);
  }

  console.log('\n=== CHECKING DEFAULT CURRENCY IN SETTINGS ===\n');

  const { data: settings, error: settingsError } = await supabase
    .from('settings')
    .select('default_currency')
    .maybeSingle();

  if (settingsError) {
    console.error('Error fetching settings:', settingsError);
  } else {
    console.log('Default Currency:', settings?.default_currency || 'NOT SET');
  }

  console.log('\n=== JANUARY 2026 TRANSACTIONS WITH ACCOUNT INFO ===\n');

  const { data: janTransactions, error: janError } = await supabase
    .from('transactions')
    .select(`
      id,
      transaction_date,
      type,
      description,
      amount,
      currency,
      transaction_lines (
        account_id,
        debit_amount,
        credit_amount,
        account:chart_of_accounts (
          name,
          currency,
          type
        )
      )
    `)
    .gte('transaction_date', '2026-01-01')
    .lte('transaction_date', '2026-01-31')
    .order('transaction_date', { ascending: false });

  if (janError) {
    console.error('Error fetching January transactions:', janError);
  } else {
    console.log('January 2026 transactions:', janTransactions?.length || 0);
    janTransactions?.forEach((tx: any) => {
      console.log(`\n${tx.type.toUpperCase()}: ${tx.description}`);
      console.log(`  Amount: ${tx.amount} ${tx.currency}`);
      console.log('  Accounts involved:');
      tx.transaction_lines?.forEach((line: any) => {
        console.log(`    - ${line.account?.name} (${line.account?.currency}) - Type: ${line.account?.type}`);
      });
    });
  }

  process.exit(0);
}

debugCurrencyData().catch(console.error);
