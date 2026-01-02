"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "./base";

export async function debugCurrencyData() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const supabase = createAdminClient();

  // Check transaction currencies
  const { data: transactions } = await supabase
    .from("transactions")
    .select("id, transaction_date, type, description, amount, currency")
    .eq("user_id", session.user.id)
    .gte("transaction_date", "2026-01-01")
    .lte("transaction_date", "2026-01-31")
    .order("transaction_date", { ascending: false });

  // Check account currencies
  const { data: accounts } = await supabase
    .from("chart_of_accounts")
    .select("id, name, type, currency")
    .eq("user_id", session.user.id)
    .eq("type", "asset");

  // Check settings
  const { data: settings } = await supabase
    .from("settings")
    .select("default_currency")
    .eq("user_id", session.user.id)
    .maybeSingle();

  return {
    defaultCurrency: settings?.default_currency || 'NOT SET',
    januaryTransactions: transactions || [],
    assetAccounts: accounts || [],
  };
}

/**
 * Fix currency mismatch in transactions
 * 
 * Problem: Transactions are stored with USD but accounts have IDR/VND/THB/MYR
 * Solution: Update transaction.currency to match the account.currency from transaction_lines
 */
export async function fixTransactionCurrencies() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const supabase = createAdminClient();

  // Get all transactions with their account info
  const { data: transactions, error: txError } = await supabase
    .from("transactions")
    .select(`
      id,
      currency,
      transaction_lines (
        account_id,
        account:chart_of_accounts (
          id,
          currency,
          type
        )
      )
    `)
    .eq("user_id", session.user.id);

  if (txError) throw txError;

  const updates: { id: string; correctCurrency: string }[] = [];
  
  for (const tx of transactions || []) {
    // Get the currency from the first asset account in the transaction
    // (For income/expense, this is the cash/bank account)
    const assetAccount = tx.transaction_lines?.find(
      (line: any) => line.account?.type === "asset"
    );

    if (assetAccount?.account?.currency && assetAccount.account.currency !== tx.currency) {
      updates.push({
        id: tx.id,
        correctCurrency: assetAccount.account.currency,
      });
    }
  }

  console.log(`Found ${updates.length} transactions with currency mismatch`);
  console.log('Updates needed:', updates);

  // Update transactions in batch
  if (updates.length > 0) {
    for (const update of updates) {
      const { error } = await supabase
        .from("transactions")
        .update({ currency: update.correctCurrency })
        .eq("id", update.id);

      if (error) {
        console.error(`Failed to update transaction ${update.id}:`, error);
      }
    }
  }

  return {
    totalChecked: transactions?.length || 0,
    totalFixed: updates.length,
    updates,
  };
}
