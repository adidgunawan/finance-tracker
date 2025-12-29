"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import {
  generateIncomeLines,
  generateIncomeLinesFromItems,
  generateExpenseLines,
  generateExpenseLinesFromItems,
  generateTransferLines,
  validateBalance,
} from "@/lib/accounting/double-entry";

type TransactionInsert = Database["public"]["Tables"]["transactions"]["Insert"];
type TransactionLineInsert = Database["public"]["Tables"]["transaction_lines"]["Insert"];

async function getSession() {
  return await auth.api.getSession({
    headers: await headers(),
  });
}

interface CreateTransactionData {
  transaction_date: string;
  transaction_id?: string;
  type: "income" | "expense" | "transfer";
  description: string;
  amount: number;
  currency?: string;
  exchange_rate?: number;
  payee_payer?: string;
  attachment_filename?: string;
  attachment_url?: string;
  lines: {
    account_id: string;
    debit_amount: number | null;
    credit_amount: number | null;
  }[];
  tag_ids?: string[];
}

export async function getTransactions() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", session.user.id)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function createTransaction(data: CreateTransactionData) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  // Validate balance
  if (!validateBalance(data.lines)) {
    throw new Error("Transaction is not balanced");
  }

  const supabase = createAdminClient();

  // Insert transaction
  const { data: transaction, error: transactionError } = await supabase
    .from("transactions")
    .insert({
      user_id: session.user.id,
      transaction_date: data.transaction_date,
      transaction_id: data.transaction_id,
      type: data.type,
      description: data.description,
      amount: data.amount,
      currency: data.currency || "USD",
      exchange_rate: data.exchange_rate || 1.0,
      payee_payer: data.payee_payer,
      attachment_filename: data.attachment_filename,
      attachment_url: data.attachment_url,
    })
    .select()
    .single();

  if (transactionError) throw new Error(transactionError.message);

  // Insert lines
  const lines = data.lines.map((line) => ({
    ...line,
    transaction_id: transaction.id,
  }));

  const { error: linesError } = await supabase
    .from("transaction_lines")
    .insert(lines);

  if (linesError) {
    // Cleanup transaction if lines fail
    await supabase.from("transactions").delete().eq("id", transaction.id);
    throw new Error(linesError.message);
  }

  // Insert tags
  if (data.tag_ids && data.tag_ids.length > 0) {
    const tagRelations = data.tag_ids.map((tag_id) => ({
      transaction_id: transaction.id,
      tag_id,
    }));

    const { error: tagsError } = await supabase
      .from("transaction_tag_relations")
      .insert(tagRelations);

    if (tagsError) console.error("Failed to add tags:", tagsError);
  }

  return transaction;
}

interface CreateTransactionWithItemsData extends CreateTransactionData {
  lineItems: Array<{
    description: string;
    amount: number;
    expense_account_id?: string;
    income_account_id?: string;
  }>;
}

export async function createTransactionWithItems(data: CreateTransactionWithItemsData) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  // Validate balance
  if (!validateBalance(data.lines)) {
    throw new Error("Transaction is not balanced");
  }

  const supabase = createAdminClient();

  // Insert transaction
  const { data: transaction, error: transactionError } = await supabase
    .from("transactions")
    .insert({
      user_id: session.user.id,
      transaction_date: data.transaction_date,
      transaction_id: data.transaction_id,
      type: data.type,
      description: data.description,
      amount: data.amount,
      currency: data.currency || "USD",
      exchange_rate: data.exchange_rate || 1.0,
      payee_payer: data.payee_payer,
      attachment_filename: data.attachment_filename,
      attachment_url: data.attachment_url,
    })
    .select()
    .single();

  if (transactionError) throw new Error(transactionError.message);

  // Insert transaction lines (double-entry)
  const lines = data.lines.map((line) => ({
    ...line,
    transaction_id: transaction.id,
  }));

  const { error: linesError } = await supabase
    .from("transaction_lines")
    .insert(lines);

  if (linesError) {
    // Cleanup transaction if lines fail
    await supabase.from("transactions").delete().eq("id", transaction.id);
    throw new Error(linesError.message);
  }

  // Insert line items (for expense/income splitting)
  if (data.lineItems && data.lineItems.length > 0) {
    const lineItems = data.lineItems.map((item) => ({
      transaction_id: transaction.id,
      description: item.description,
      amount: item.amount,
      expense_account_id: item.expense_account_id || null,
      income_account_id: item.income_account_id || null,
    }));

    const { error: itemsError } = await supabase
      .from("transaction_line_items")
      .insert(lineItems);

    if (itemsError) {
      console.error("Failed to add line items:", itemsError);
      // Don't fail the transaction if line items fail, but log it
    }
  }

  // Insert tags
  if (data.tag_ids && data.tag_ids.length > 0) {
    const tagRelations = data.tag_ids.map((tag_id) => ({
      transaction_id: transaction.id,
      tag_id,
    }));

    const { error: tagsError } = await supabase
      .from("transaction_tag_relations")
      .insert(tagRelations);

    if (tagsError) console.error("Failed to add tags:", tagsError);
  }

  return transaction;
}

export async function getTransaction(id: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(`
      *,
      transaction_lines(
        *,
        account:chart_of_accounts(id, name, type)
      ),
      transaction_line_items(
        *,
        expense_account:chart_of_accounts!transaction_line_items_expense_account_id_fkey(id, name),
        income_account:chart_of_accounts!transaction_line_items_income_account_id_fkey(id, name)
      )
    `)
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateTransaction(id: string, data: Partial<CreateTransactionData>) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const supabase = createAdminClient();

  // Update transaction
  const updateData: any = {};
  if (data.transaction_date !== undefined) updateData.transaction_date = data.transaction_date;
  if (data.transaction_id !== undefined) updateData.transaction_id = data.transaction_id;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.amount !== undefined) updateData.amount = data.amount;
  if (data.currency !== undefined) updateData.currency = data.currency;
  if (data.exchange_rate !== undefined) updateData.exchange_rate = data.exchange_rate;
  if (data.payee_payer !== undefined) updateData.payee_payer = data.payee_payer;
  updateData.updated_at = new Date().toISOString();

  const { data: transaction, error: transactionError } = await supabase
    .from("transactions")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", session.user.id)
    .select()
    .single();

  if (transactionError) throw new Error(transactionError.message);

  // Update lines if provided
  if (data.lines) {
    // Validate balance
    if (!validateBalance(data.lines)) {
      throw new Error("Transaction is not balanced");
    }

    // Delete existing lines
    await supabase.from("transaction_lines").delete().eq("transaction_id", id);

    // Insert new lines
    const lines = data.lines.map((line) => ({
      ...line,
      transaction_id: id,
    }));

    const { error: linesError } = await supabase
      .from("transaction_lines")
      .insert(lines);

    if (linesError) throw new Error(linesError.message);
  }

  return transaction;
}

export async function deleteTransaction(id: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", session.user.id);

  if (error) throw new Error(error.message);
}


