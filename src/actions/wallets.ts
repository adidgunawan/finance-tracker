"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import { createTransaction } from "./transactions";

type Account = Database["public"]["Tables"]["chart_of_accounts"]["Row"];
type TransactionLineInsert = Database["public"]["Tables"]["transaction_lines"]["Insert"];

async function getSession() {
  return await auth.api.getSession({
    headers: await headers(),
  });
}

/**
 * Get all wallet accounts (asset accounts with is_wallet = true)
 */
export async function getWallets(): Promise<Account[]> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("chart_of_accounts")
    .select("*")
    .eq("user_id", session.user.id)
    .eq("type", "asset")
    .eq("is_wallet", true)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Calculate wallet balance from transaction lines
 * For asset accounts: Balance = Sum of debits - Sum of credits
 */
export async function getWalletBalance(walletId: string): Promise<number> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const supabase = createAdminClient();

  // Verify wallet belongs to user
  const { data: wallet, error: walletError } = await supabase
    .from("chart_of_accounts")
    .select("id")
    .eq("id", walletId)
    .eq("user_id", session.user.id)
    .eq("is_wallet", true)
    .single();

  if (walletError || !wallet) {
    throw new Error("Wallet not found");
  }

  // Get all transaction lines for this account
  const { data: lines, error: linesError } = await supabase
    .from("transaction_lines")
    .select("debit_amount, credit_amount")
    .eq("account_id", walletId);

  if (linesError) throw new Error(linesError.message);

  // Calculate balance: Sum(debits) - Sum(credits)
  let totalDebits = 0;
  let totalCredits = 0;

  (lines || []).forEach((line) => {
    if (line.debit_amount) totalDebits += Number(line.debit_amount);
    if (line.credit_amount) totalCredits += Number(line.credit_amount);
  });

  return totalDebits - totalCredits;
}

/**
 * Get or create the Opening Balance Equity account
 */
async function getOrCreateOpeningBalanceEquityAccount(): Promise<string> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const supabase = createAdminClient();

  // Check if account already exists
  const { data: existingAccount } = await supabase
    .from("chart_of_accounts")
    .select("id")
    .eq("user_id", session.user.id)
    .eq("type", "equity")
    .eq("name", "Opening Balance Equity")
    .single();

  if (existingAccount) {
    return existingAccount.id;
  }

  // Create the account
  const { data: newAccount, error } = await supabase
    .from("chart_of_accounts")
    .insert({
      user_id: session.user.id,
      name: "Opening Balance Equity",
      type: "equity",
      level: 1,
      parent_id: null,
      is_active: true,
      is_wallet: false,
    })
    .select()
    .single();

  if (error || !newAccount) {
    throw new Error(`Failed to create Opening Balance Equity account: ${error?.message || "Unknown error"}`);
  }

  return newAccount.id;
}

/**
 * Check if wallet already has an opening balance transaction
 */
async function hasOpeningBalance(walletId: string): Promise<boolean> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const supabase = createAdminClient();

  // Get all transaction IDs for this wallet
  const { data: transactionLines } = await supabase
    .from("transaction_lines")
    .select("transaction_id")
    .eq("account_id", walletId);

  if (!transactionLines || transactionLines.length === 0) {
    return false;
  }

  const transactionIds = transactionLines.map((tl) => tl.transaction_id);

  // Check for transactions with description "Opening Balance"
  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("id")
    .eq("user_id", session.user.id)
    .eq("description", "Opening Balance")
    .in("id", transactionIds);

  if (error) {
    // If error, assume no opening balance
    return false;
  }

  return (transactions?.length || 0) > 0;
}

/**
 * Set opening balance for a wallet
 * Creates a double-entry transaction: Debit wallet, Credit equity account
 */
export async function setOpeningBalance(
  walletId: string,
  amount: number,
  date: string
): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  if (amount < 0) {
    throw new Error("Opening balance cannot be negative");
  }

  const supabase = createAdminClient();

  // Verify wallet belongs to user and is a wallet
  const { data: wallet, error: walletError } = await supabase
    .from("chart_of_accounts")
    .select("id, currency")
    .eq("id", walletId)
    .eq("user_id", session.user.id)
    .eq("is_wallet", true)
    .single();

  if (walletError || !wallet) {
    throw new Error("Wallet not found");
  }

  // Check if opening balance already exists
  const hasExisting = await hasOpeningBalance(walletId);
  if (hasExisting) {
    throw new Error("Opening balance already set for this wallet. Please update or delete the existing opening balance transaction.");
  }

  // Get or create Opening Balance Equity account
  const equityAccountId = await getOrCreateOpeningBalanceEquityAccount();

  // Create transaction lines: Debit wallet, Credit equity
  const lines = [
    {
      account_id: walletId,
      debit_amount: amount,
      credit_amount: null,
    },
    {
      account_id: equityAccountId,
      debit_amount: null,
      credit_amount: amount,
    },
  ];

  // Create transaction
  await createTransaction({
    transaction_date: date,
    type: "transfer",
    description: "Opening Balance",
    amount: amount,
    currency: wallet.currency || "USD",
    exchange_rate: 1.0,
    lines: lines,
  });
}

/**
 * Get wallet with balance
 */
export interface WalletWithBalance extends Account {
  balance: number;
}

export async function getWalletsWithBalance(): Promise<WalletWithBalance[]> {
  const wallets = await getWallets();
  
  const walletsWithBalance = await Promise.all(
    wallets.map(async (wallet) => {
      const balance = await getWalletBalance(wallet.id);
      return {
        ...wallet,
        balance,
      };
    })
  );

  return walletsWithBalance;
}
