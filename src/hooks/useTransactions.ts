"use client";

import { useState, useEffect } from "react";
import type { Database } from "@/lib/supabase/types";
import {
  getTransactions,
  getTransaction as serverGetTransaction,
  createTransaction as serverCreateTransaction,
  createTransactionWithItems as serverCreateTransactionWithItems,
  updateTransaction as serverUpdateTransaction,
  deleteTransaction as serverDeleteTransaction,
  linkAttachmentsToTransaction,
} from "@/actions/transactions";
import {
  generateIncomeLines,
  generateIncomeLinesFromItems,
  generateExpenseLines,
  generateExpenseLinesFromItems,
  generateTransferLines,
} from "@/lib/accounting/double-entry";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"] & {
  transaction_lines?: any[];
  transaction_attachments?: any[];
};

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      // Only fetch if authenticated (handled by server action throwing)
      const data = await getTransactions();
      setTransactions(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to fetch transactions");
    } finally {
      setLoading(false);
    }
  };

  // Re-expose legacy functions wrapping server actions
  const createIncome = async (
    date: string,
    description: string,
    amount: number,
    incomeAccountId: string,
    assetAccountId: string,
    // New params optional for backward compat for now
    currency = "USD",
    exchangeRate = 1.0
  ) => {
    const lines = generateIncomeLines(incomeAccountId, assetAccountId, amount);
    const transaction = await serverCreateTransaction({
      transaction_date: date,
      type: "income",
      description,
      amount,
      currency,
      exchange_rate: exchangeRate,
      lines,
    });
    setTransactions((prev) => [transaction, ...prev]);
    return transaction;
  };

  const createIncomeWithItems = async (
    date: string,
    lineItems: Array<{
      description: string;
      amount: number;
      incomeAccountId: string;
    }>,
    assetAccountId: string,
    payee?: string,
    transactionId?: string,
    currency = "USD",
    exchangeRate = 1.0,
    attachmentIds?: string[]
  ) => {
    const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const mainDescription =
      lineItems.length === 1
        ? lineItems[0].description
        : `Multiple items (${lineItems.length} items)`;

    const lines = generateIncomeLinesFromItems(
      lineItems.map((item) => ({
        incomeAccountId: item.incomeAccountId,
        amount: item.amount,
      })),
      assetAccountId
    );

    const transaction = await serverCreateTransactionWithItems({
      transaction_date: date,
      type: "income",
      description: mainDescription,
      amount: totalAmount,
      payee_payer: payee,
      transaction_id: transactionId,
      currency,
      exchange_rate: exchangeRate,
      lines,
      lineItems: lineItems.map((item) => ({
        description: item.description,
        amount: item.amount,
        income_account_id: item.incomeAccountId,
      })),
    });
    
    // Link attachments if provided
    if (attachmentIds && attachmentIds.length > 0 && transaction?.id) {
      try {
        await linkAttachmentsToTransaction(transaction.id, attachmentIds);
      } catch (linkError) {
        console.error("Failed to link attachments:", linkError);
        throw new Error("Transaction created but failed to link attachments");
      }
    }
    
    setTransactions((prev) => [transaction, ...prev]);
    return transaction;
  };

  const createExpense = async (
    date: string,
    description: string,
    amount: number,
    expenseAccountId: string,
    assetAccountId: string,
    payee?: string,
    currency = "USD",
    exchangeRate = 1.0
  ) => {
    const lines = generateExpenseLines(expenseAccountId, assetAccountId, amount);
    const transaction = await serverCreateTransaction({
      transaction_date: date,
      type: "expense",
      description,
      amount,
      payee_payer: payee,
      currency,
      exchange_rate: exchangeRate,
      lines,
    });
    setTransactions((prev) => [transaction, ...prev]);
    return transaction;
  };

  const createExpenseWithItems = async (
    date: string,
    lineItems: Array<{
      description: string;
      amount: number;
      expenseAccountId: string;
    }>,
    assetAccountId: string,
    payee?: string,
    transactionId?: string,
    currency = "USD",
    exchangeRate = 1.0,
    attachmentIds?: string[]
  ) => {
    const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const mainDescription =
      lineItems.length === 1
        ? lineItems[0].description
        : `Multiple items (${lineItems.length} items)`;

    const lines = generateExpenseLinesFromItems(
      lineItems.map((item) => ({
        expenseAccountId: item.expenseAccountId,
        amount: item.amount,
      })),
      assetAccountId
    );

    const transaction = await serverCreateTransactionWithItems({
      transaction_date: date,
      type: "expense",
      description: mainDescription,
      amount: totalAmount,
      payee_payer: payee,
      transaction_id: transactionId,
      currency,
      exchange_rate: exchangeRate,
      lines,
      lineItems: lineItems.map((item) => ({
        description: item.description,
        amount: item.amount,
        expense_account_id: item.expenseAccountId,
      })),
    });
    
    // Link attachments if provided
    if (attachmentIds && attachmentIds.length > 0 && transaction?.id) {
      try {
        await linkAttachmentsToTransaction(transaction.id, attachmentIds);
      } catch (linkError) {
        console.error("Failed to link attachments:", linkError);
        throw new Error("Transaction created but failed to link attachments");
      }
    }
    
    setTransactions((prev) => [transaction, ...prev]);
    return transaction;
  };

  const createTransfer = async (
    date: string,
    description: string,
    amount: number,
    fromAccountId: string,
    toAccountId: string,
    feeAmount?: number,
    feeAccountId?: string,
    currency = "USD",
    exchangeRate = 1.0,
    attachmentIds?: string[]
  ) => {
    const lines = generateTransferLines(
      fromAccountId,
      toAccountId,
      amount,
      feeAccountId,
      feeAmount
    );
    const transaction = await serverCreateTransaction({
      transaction_date: date,
      type: "transfer",
      description,
      amount,
      currency,
      exchange_rate: exchangeRate,
      lines,
    });
    
    // Link attachments if provided
    if (attachmentIds && attachmentIds.length > 0 && transaction?.id) {
      try {
        await linkAttachmentsToTransaction(transaction.id, attachmentIds);
      } catch (linkError) {
        console.error("Failed to link attachments:", linkError);
        throw new Error("Transaction created but failed to link attachments");
      }
    }
    
    setTransactions((prev) => [transaction, ...prev]);
    return transaction;
  };

  const getTransaction = async (id: string) => {
    try {
      return await serverGetTransaction(id);
    } catch (err) {
      throw err;
    }
  };

  const updateTransaction = async (
    id: string,
    data: {
      transaction_date: string;
      description: string;
      amount: number;
      payee_payer?: string;
      transaction_id?: string;
    }
  ) => {
    try {
      // Get the transaction to preserve type and lines
      const existing = transactions.find((t) => t.id === id);
      if (!existing) throw new Error("Transaction not found");

      // For now, we'll just update basic fields
      // Full line item editing would require more complex logic
      const updated = await serverUpdateTransaction(id, {
        transaction_date: data.transaction_date,
        description: data.description,
        amount: data.amount,
        payee_payer: data.payee_payer,
        transaction_id: data.transaction_id,
      });

      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updated } : t))
      );
      return updated;
    } catch (err) {
      throw err;
    }
  };

  const deleteTransaction = async (id: string) => {
    await serverDeleteTransaction(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  return {
    transactions,
    loading,
    error,
    createIncome,
    createIncomeWithItems,
    createExpense,
    createExpenseWithItems,
    createTransfer,
    getTransaction,
    updateTransaction,
    deleteTransaction,
    refreshTransactions: fetchTransactions,
  };
}
