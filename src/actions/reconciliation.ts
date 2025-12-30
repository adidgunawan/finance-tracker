"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import { parseBCACSVFile, type ParsedCSVData } from "@/lib/utils/csv-parser";
import { autoMatchAll, type MatchResult } from "@/lib/utils/transaction-matcher";
import { generateExpenseLines, generateIncomeLines } from "@/lib/accounting/double-entry";
import { createTransaction } from "./transactions";

async function getSession() {
  return await auth.api.getSession({
    headers: await headers(),
  });
}

export interface ReconciliationSession {
  id: string;
  user_id: string;
  account_id: string;
  filename: string;
  parsed_data: ParsedCSVData;
  status: "in_progress" | "completed";
  created_at: string;
  updated_at: string;
}

export interface ReconciliationMatch {
  id: string;
  session_id: string;
  csv_row_index: number;
  transaction_id: string | null;
  match_type: "auto" | "manual" | "none";
  created_at: string;
}

/**
 * Create a new reconciliation session from a CSV file
 */
export async function createReconciliationSession(
  accountId: string,
  file: File
): Promise<ReconciliationSession> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  // Verify account belongs to user and is an asset account
  const supabase = createAdminClient();
  const { data: account, error: accountError } = await supabase
    .from("chart_of_accounts")
    .select("id, type, currency")
    .eq("id", accountId)
    .eq("user_id", session.user.id)
    .eq("type", "asset")
    .single();

  if (accountError || !account) {
    throw new Error("Account not found or is not an asset account");
  }

  // Parse CSV file
  const parsedData = await parseBCACSVFile(file);

  // Create session
  const { data: reconciliationSession, error: sessionError } = await supabase
    .from("reconciliation_sessions")
    .insert({
      user_id: session.user.id,
      account_id: accountId,
      filename: file.name,
      parsed_data: parsedData as any,
      status: "in_progress",
    })
    .select()
    .single();

  if (sessionError) {
    throw new Error(`Failed to create reconciliation session: ${sessionError.message}`);
  }

  // Get existing transactions for the account to auto-match
  // First get transaction line IDs for this account
  const { data: transactionLines } = await supabase
    .from("transaction_lines")
    .select("transaction_id")
    .eq("account_id", accountId);

  const transactionIds = transactionLines?.map((tl) => tl.transaction_id) || [];

  // Get transactions
  const { data: transactions } = transactionIds.length > 0
    ? await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", session.user.id)
        .in("id", transactionIds)
        .order("transaction_date", { ascending: false })
    : { data: [] };

  // Auto-match transactions
  if (transactions && transactions.length > 0) {
    const matchResults = autoMatchAll(parsedData.transactions, transactions as any);
    
    // Create match records
    const matches = matchResults.map((result, index) => ({
      session_id: reconciliationSession.id,
      csv_row_index: index,
      transaction_id: result.bestMatch?.transactionId || null,
      match_type: result.bestMatch ? "auto" : "none" as "auto" | "manual" | "none",
    }));

    if (matches.length > 0) {
      await supabase.from("reconciliation_matches").insert(matches);
    }
  } else {
    // Create empty match records for all CSV rows
    const matches = parsedData.transactions.map((_, index) => ({
      session_id: reconciliationSession.id,
      csv_row_index: index,
      transaction_id: null,
      match_type: "none" as const,
    }));

    if (matches.length > 0) {
      await supabase.from("reconciliation_matches").insert(matches);
    }
  }

  return {
    ...reconciliationSession,
    parsed_data: parsedData,
  } as ReconciliationSession;
}

/**
 * Get a reconciliation session with matches
 */
export async function getReconciliationSession(
  sessionId: string
): Promise<ReconciliationSession & { matches: ReconciliationMatch[] }> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const supabase = createAdminClient();

  // Get session
  const { data: reconciliationSession, error: sessionError } = await supabase
    .from("reconciliation_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", session.user.id)
    .single();

  if (sessionError || !reconciliationSession) {
    throw new Error("Reconciliation session not found");
  }

  // Get matches
  const { data: matches, error: matchesError } = await supabase
    .from("reconciliation_matches")
    .select("*")
    .eq("session_id", sessionId)
    .order("csv_row_index", { ascending: true });

  if (matchesError) {
    throw new Error(`Failed to get matches: ${matchesError.message}`);
  }

  return {
    ...reconciliationSession,
    parsed_data: reconciliationSession.parsed_data as ParsedCSVData,
    matches: (matches || []) as ReconciliationMatch[],
  };
}

/**
 * Get all reconciliation sessions for the user
 */
export async function getReconciliationSessions(): Promise<ReconciliationSession[]> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("reconciliation_sessions")
    .select("*")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to get reconciliation sessions: ${error.message}`);
  }

  return (data || []).map((session) => ({
    ...session,
    parsed_data: session.parsed_data as ParsedCSVData,
  })) as ReconciliationSession[];
}

/**
 * Match a CSV row to a transaction
 */
export async function matchTransaction(
  sessionId: string,
  csvRowIndex: number,
  transactionId: string | null
): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const supabase = createAdminClient();

  // Verify session belongs to user
  const { data: reconciliationSession, error: sessionError } = await supabase
    .from("reconciliation_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", session.user.id)
    .single();

  if (sessionError || !reconciliationSession) {
    throw new Error("Reconciliation session not found");
  }

  // Verify transaction belongs to user if provided
  if (transactionId) {
    const { data: transaction, error: transactionError } = await supabase
      .from("transactions")
      .select("id")
      .eq("id", transactionId)
      .eq("user_id", session.user.id)
      .single();

    if (transactionError || !transaction) {
      throw new Error("Transaction not found");
    }
  }

  // Update or insert match
  const { error: matchError } = await supabase
    .from("reconciliation_matches")
    .upsert({
      session_id: sessionId,
      csv_row_index: csvRowIndex,
      transaction_id: transactionId,
      match_type: transactionId ? "manual" : "none",
    }, {
      onConflict: "session_id,csv_row_index",
    });

  if (matchError) {
    throw new Error(`Failed to match transaction: ${matchError.message}`);
  }

  // Update session updated_at
  await supabase
    .from("reconciliation_sessions")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", sessionId);
}

/**
 * Unmatch a CSV row (remove the match)
 */
export async function unmatchTransaction(
  sessionId: string,
  csvRowIndex: number
): Promise<void> {
  await matchTransaction(sessionId, csvRowIndex, null);
}

/**
 * Auto-match all transactions in a session
 */
export async function autoMatchAllTransactions(sessionId: string): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const supabase = createAdminClient();

  // Get session
  const reconciliationSession = await getReconciliationSession(sessionId);
  if (!reconciliationSession) {
    throw new Error("Reconciliation session not found");
  }

  // Get existing transactions for the account
  // First get transaction line IDs for this account
  const { data: transactionLines } = await supabase
    .from("transaction_lines")
    .select("transaction_id")
    .eq("account_id", reconciliationSession.account_id);

  const transactionIds = transactionLines?.map((tl) => tl.transaction_id) || [];

  // Get transactions
  const { data: transactions } = transactionIds.length > 0
    ? await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", session.user.id)
        .in("id", transactionIds)
        .order("transaction_date", { ascending: false })
    : { data: [] };

  if (!transactions || transactions.length === 0) {
    return;
  }

  // Auto-match
  const matchResults = autoMatchAll(
    reconciliationSession.parsed_data.transactions,
    transactions as any
  );

  // Update matches
  const matches = matchResults.map((result, index) => ({
    session_id: sessionId,
    csv_row_index: index,
    transaction_id: result.bestMatch?.transactionId || null,
    match_type: result.bestMatch ? "auto" : "none" as "auto" | "manual" | "none",
  }));

  // Delete existing matches and insert new ones
  await supabase.from("reconciliation_matches").delete().eq("session_id", sessionId);
  
  if (matches.length > 0) {
    await supabase.from("reconciliation_matches").insert(matches);
  }

  // Update session
  await supabase
    .from("reconciliation_sessions")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", sessionId);
}

/**
 * Create a transaction from an unmatched CSV row
 */
export async function createTransactionFromCSVRow(
  sessionId: string,
  csvRowIndex: number,
  transactionData: {
    type: "income" | "expense" | "transfer";
    transaction_date?: string;
    amount?: number;
    description?: string;
    payee?: string;
    transaction_id?: string;
    expenseAccountId?: string;
    incomeAccountId?: string;
    fromAccountId?: string;
    toAccountId?: string;
    feeAmount?: number;
    feeAccountId?: string;
    currency?: string;
    exchange_rate?: number;
    attachmentIds?: string[];
    lineItems?: Array<{
      description: string;
      amount: number;
      expenseAccountId?: string;
      incomeAccountId?: string;
    }>;
  }
): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const supabase = createAdminClient();

  // Get session
  const reconciliationSession = await getReconciliationSession(sessionId);
  if (!reconciliationSession) {
    throw new Error("Reconciliation session not found");
  }

  // Get CSV transaction
  const csvTransaction = reconciliationSession.parsed_data.transactions[csvRowIndex];
  if (!csvTransaction) {
    throw new Error("CSV transaction not found");
  }

  // Determine transaction type from CSV if not provided
  const type = transactionData.type || (csvTransaction.type === "credit" ? "income" : "expense");

  // Get account currency
  const { data: account } = await supabase
    .from("chart_of_accounts")
    .select("currency")
    .eq("id", reconciliationSession.account_id)
    .single();

  const currency = transactionData.currency || account?.currency || "IDR";
  const exchangeRate = transactionData.exchange_rate || 1.0;

  // Use provided values or fall back to CSV values
  const transactionDate = transactionData.transaction_date || csvTransaction.date;
  const description = transactionData.description || csvTransaction.description;
  const amount = transactionData.amount !== undefined ? transactionData.amount : csvTransaction.amount;

  // Handle income/expense with line items
  if ((type === "income" || type === "expense") && transactionData.lineItems && transactionData.lineItems.length > 0) {
    const { generateIncomeLinesFromItems, generateExpenseLinesFromItems } = await import("@/lib/accounting/double-entry");
    const { createTransactionWithItems } = await import("./transactions");
    
    const totalAmount = transactionData.lineItems.reduce((sum, item) => sum + item.amount, 0);
    const mainDescription =
      transactionData.lineItems.length === 1
        ? transactionData.lineItems[0].description
        : description || `Multiple items (${transactionData.lineItems.length} items)`;

    let lines;
    if (type === "income") {
      lines = generateIncomeLinesFromItems(
        transactionData.lineItems.map((item) => ({
          incomeAccountId: item.incomeAccountId!,
          amount: item.amount,
        })),
        reconciliationSession.account_id
      );
    } else {
      lines = generateExpenseLinesFromItems(
        transactionData.lineItems.map((item) => ({
          expenseAccountId: item.expenseAccountId!,
          amount: item.amount,
        })),
        reconciliationSession.account_id
      );
    }

    const transaction = await createTransactionWithItems({
      transaction_date: transactionDate,
      transaction_id: transactionData.transaction_id,
      type,
      description: mainDescription,
      amount: totalAmount,
      currency,
      exchange_rate: exchangeRate,
      payee_payer: transactionData.payee || csvTransaction.description,
      lines,
      lineItems: transactionData.lineItems.map((item) => ({
        description: item.description,
        amount: item.amount,
        expense_account_id: item.expenseAccountId || undefined,
        income_account_id: item.incomeAccountId || undefined,
      })),
    });

    // Link attachments if provided
    if (transactionData.attachmentIds && transactionData.attachmentIds.length > 0) {
      const { linkAttachmentsToTransaction } = await import("./transactions");
      await linkAttachmentsToTransaction(transaction.id, transactionData.attachmentIds);
    }

    // Match the CSV row to the new transaction
    await matchTransaction(sessionId, csvRowIndex, transaction.id);
    return;
  }

  // Handle single account income/expense or transfer
  let lines;
  if (type === "income") {
    if (!transactionData.incomeAccountId) {
      throw new Error("Income account is required");
    }
    lines = generateIncomeLines(transactionData.incomeAccountId, reconciliationSession.account_id, amount);
  } else if (type === "expense") {
    if (!transactionData.expenseAccountId) {
      throw new Error("Expense account is required");
    }
    lines = generateExpenseLines(transactionData.expenseAccountId, reconciliationSession.account_id, amount);
  } else if (type === "transfer") {
    if (!transactionData.fromAccountId || !transactionData.toAccountId) {
      throw new Error("From and To accounts are required for transfers");
    }
    lines = generateTransferLines(
      transactionData.fromAccountId,
      transactionData.toAccountId,
      amount,
      transactionData.feeAccountId,
      transactionData.feeAmount
    );
  } else {
    throw new Error("Invalid transaction type");
  }

  const transaction = await createTransaction({
    transaction_date: transactionDate,
    transaction_id: transactionData.transaction_id,
    type,
    description,
    amount,
    currency,
    exchange_rate: exchangeRate,
    payee_payer: transactionData.payee || csvTransaction.description,
    lines,
  });

  // Link attachments if provided
  if (transactionData.attachmentIds && transactionData.attachmentIds.length > 0) {
    const { linkAttachmentsToTransaction } = await import("./transactions");
    await linkAttachmentsToTransaction(transaction.id, transactionData.attachmentIds);
  }

  // Match the CSV row to the new transaction
  await matchTransaction(sessionId, csvRowIndex, transaction.id);
}

/**
 * Delete a reconciliation session
 */
export async function deleteReconciliationSession(sessionId: string): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const supabase = createAdminClient();

  // Verify session belongs to user
  const { error } = await supabase
    .from("reconciliation_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", session.user.id);

  if (error) {
    throw new Error(`Failed to delete reconciliation session: ${error.message}`);
  }
}

/**
 * Mark reconciliation session as completed
 */
export async function completeReconciliationSession(sessionId: string): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const supabase = createAdminClient();

  // Verify session belongs to user
  const { error } = await supabase
    .from("reconciliation_sessions")
    .update({
      status: "completed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("user_id", session.user.id);

  if (error) {
    throw new Error(`Failed to complete reconciliation session: ${error.message}`);
  }
}

