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

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";

export function useTransactions() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  const { 
    data: queryResult,
    isLoading: loading, 
    error: queryError 
  } = useQuery({
    queryKey: ['transactions', page, pageSize],
    queryFn: async () => {
      return await getTransactions(page, pageSize);
    },
     // Cache for 30 minutes, don't refetch on window focus
     staleTime: 5 * 60 * 1000,
     placeholderData: keepPreviousData,
  });

  const transactions = queryResult?.data || [];
  const totalCount = queryResult?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const error = queryError instanceof Error ? queryError.message : (queryError ? "Failed to fetch" : null);

  // Legacy fetch function needed for refresh button (exposed as refreshTransactions)
  const fetchTransactions = () => queryClient.invalidateQueries({ queryKey: ['transactions'] });


  // Mutations
  const { mutateAsync: createIncomeMutation } = useMutation({
    mutationFn: async (params: any) => {
        const { date, description, amount, incomeAccountId, assetAccountId, currency, exchangeRate } = params;
        const lines = generateIncomeLines(incomeAccountId, assetAccountId, amount);
        return await serverCreateTransaction({
          transaction_date: date,
          type: "income",
          description,
          amount,
          currency,
          exchange_rate: exchangeRate,
          lines,
        });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
  });

  const createIncome = async (
    date: string,
    description: string,
    amount: number,
    incomeAccountId: string,
    assetAccountId: string,
    currency = "USD",
    exchangeRate = 1.0
  ) => {
    return createIncomeMutation({ date, description, amount, incomeAccountId, assetAccountId, currency, exchangeRate });
  };

  const { mutateAsync: createIncomeWithItemsMutation } = useMutation({
    mutationFn: async (params: any) => {
        // ... (complex logic moved here or kept in wrapper)
        // For simplicity in this refactor, we'll keep the logic in the wrapper
        // and just invalidate on success. A full refactor would move logic to server action.
        return null; 
    }
  });


  // COMPATIBILITY LAYER:
  // Instead of full rewrite of all logic inside mutations, we wrap existing logic
  // and simply INVALIDATE queries after success.
  
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
    // ... (Keep existing logic to generate lines) ...
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
       await linkAttachmentsToTransaction(transaction.id, attachmentIds);
    }
    
    // SERVER STATE UPDATE
    await queryClient.invalidateQueries({ queryKey: ['transactions'] });
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
    await queryClient.invalidateQueries({ queryKey: ['transactions'] });
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

    if (attachmentIds && attachmentIds.length > 0 && transaction?.id) {
        await linkAttachmentsToTransaction(transaction.id, attachmentIds);
    }

    await queryClient.invalidateQueries({ queryKey: ['transactions'] });
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
    
    if (attachmentIds && attachmentIds.length > 0 && transaction?.id) {
        await linkAttachmentsToTransaction(transaction.id, attachmentIds);
    }
    
    await queryClient.invalidateQueries({ queryKey: ['transactions'] });
    return transaction;
  };

  const getTransaction = async (id: string) => {
    // Try cache first? For now, keep as fetch
    return await serverGetTransaction(id);
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
      const existing = transactions.find((t) => t.id === id);
      if (!existing) throw new Error("Transaction not found");

      const updated = await serverUpdateTransaction(id, {
        transaction_date: data.transaction_date,
        description: data.description,
        amount: data.amount,
        payee_payer: data.payee_payer,
        transaction_id: data.transaction_id,
      });

      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      return updated;
  };

  const deleteTransaction = async (id: string) => {
    await serverDeleteTransaction(id);
    await queryClient.invalidateQueries({ queryKey: ['transactions'] });
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
    // Pagination
    page,
    setPage,
    pageSize,
    setPageSize,
    totalCount,
    totalPages,
  };
}
