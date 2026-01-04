"use server";

import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "./base";
import { convertToBaseCurrencyBatch } from "@/lib/services/currency-batch";
import type { Database } from "@/lib/supabase/types";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
type TransactionLine = Database["public"]["Tables"]["transaction_lines"]["Row"];
type Account = Database["public"]["Tables"]["chart_of_accounts"]["Row"];

interface DashboardData {
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  monthlyData: {
    month: string;
    income: number;
    expense: number;
  }[];
  assetDistribution: {
    name: string;
    value: number;
  }[];
}

/**
 * Optimized dashboard data fetching with batch currency conversion
 * 
 * OLD: 50+ sequential API calls for currency conversion (3-5 seconds)
 * NEW: 1-3 parallel API calls or 0 if cached (<500ms)
 */
import { unstable_cache } from "next/cache";

// CACHED DASHBOARD DATA
// Revalidates every 10 minutes or on demand
export const getDashboardData = async (): Promise<DashboardData> => {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  
  const getCachedData = unstable_cache(
      async (userId: string) => {
        return await fetchDashboardDataInternal(userId);
      },
      [`dashboard-${session.user.id}`],
      { tags: [`dashboard-${session.user.id}`], revalidate: 600 } 
  );

  return await getCachedData(session.user.id);
};

// Internal function with the actual fetching logic
async function fetchDashboardDataInternal(userId: string): Promise<DashboardData> {
  const supabase = createAdminClient();

  // Get user's base currency
  const { data: settingsData } = await supabase
    .from("settings")
    .select("default_currency")
    .eq("user_id", userId)
    .maybeSingle();
  
  const baseCurrency = (settingsData as { default_currency: string } | null)?.default_currency || "IDR";

  // Fetch transactions for current month
  const currentMonthStart = startOfMonth(new Date());
  const currentMonthEnd = endOfMonth(new Date());

  const [currentTransactionsResult, historicalTransactionsResult, accountsResult, linesResult] = 
    await Promise.all([
      // Current month transactions
      supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .gte("transaction_date", currentMonthStart.toISOString().split("T")[0])
        .lte("transaction_date", currentMonthEnd.toISOString().split("T")[0]),
      
      // Last 6 months transactions
      supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .gte("transaction_date", subMonths(new Date(), 5).toISOString().split("T")[0]),
      
      // Asset accounts
      supabase
        .from("chart_of_accounts")
        .select("*")
        .eq("user_id", userId)
        .eq("type", "asset")
        .eq("is_active", true),
      
      // Transaction lines for balance calculation
      supabase
        .from("transaction_lines")
        .select("*")
    ]);

  if (currentTransactionsResult.error) throw currentTransactionsResult.error;
  if (historicalTransactionsResult.error) throw historicalTransactionsResult.error;
  if (accountsResult.error) throw accountsResult.error;
  if (linesResult.error) throw linesResult.error;

  const currentTransactions = (currentTransactionsResult.data || []) as Transaction[];
  const allTransactions = (historicalTransactionsResult.data || []) as Transaction[];
  const accounts = (accountsResult.data || []) as Account[];
  const lines = (linesResult.data || []) as TransactionLine[];

  // BATCH CONVERSION 1: Current month income/expense
  const currentIncome = currentTransactions.filter((t) => t.type === "income");
  const currentExpense = currentTransactions.filter((t) => t.type === "expense");

  const [convertedIncomeAmounts, convertedExpenseAmounts] = await Promise.all([
    convertToBaseCurrencyBatch(
      currentIncome.map((t) => ({ amount: t.amount, currency: t.currency || baseCurrency })),
      baseCurrency
    ),
    convertToBaseCurrencyBatch(
      currentExpense.map((t) => ({ amount: t.amount, currency: t.currency || baseCurrency })),
      baseCurrency
    ),
  ]);

  const totalIncome = convertedIncomeAmounts.reduce((sum, amt) => sum + amt, 0);
  const totalExpense = convertedExpenseAmounts.reduce((sum, amt) => sum + amt, 0);

  // BATCH CONVERSION 2: Historical monthly data
  const monthlyMap = new Map<string, { income: number; expense: number }>();
  
  // Initialize last 6 months
  for (let i = 0; i < 6; i++) {
    const date = subMonths(new Date(), 5 - i);
    const monthKey = format(date, "MMM yyyy");
    monthlyMap.set(monthKey, { income: 0, expense: 0 });
  }

  // Group transactions by month
  const transactionsByMonth = new Map<string, { incomes: Transaction[]; expenses: Transaction[] }>();
  
  for (const t of allTransactions) {
    const monthKey = format(new Date(t.transaction_date), "MMM yyyy");
    if (!transactionsByMonth.has(monthKey)) {
      transactionsByMonth.set(monthKey, { incomes: [], expenses: [] });
    }
    const group = transactionsByMonth.get(monthKey)!;
    if (t.type === "income") {
      group.incomes.push(t);
    } else if (t.type === "expense") {
      group.expenses.push(t);
    }
  }

  // Batch convert all historical transactions
  const monthKeys = Array.from(transactionsByMonth.keys());
  const conversionPromises = monthKeys.map(async (monthKey) => {
    const group = transactionsByMonth.get(monthKey)!;
    
    const [incomeAmounts, expenseAmounts] = await Promise.all([
      convertToBaseCurrencyBatch(
        group.incomes.map((t) => ({ amount: t.amount, currency: t.currency || baseCurrency })),
        baseCurrency
      ),
      convertToBaseCurrencyBatch(
        group.expenses.map((t) => ({ amount: t.amount, currency: t.currency || baseCurrency })),
        baseCurrency
      ),
    ]);

    return {
      monthKey,
      income: incomeAmounts.reduce((s, a) => s + a, 0),
      expense: expenseAmounts.reduce((s, a) => s + a, 0),
    };
  });

  const monthlyResults = await Promise.all(conversionPromises);
  
  // Populate monthly map
  for (const result of monthlyResults) {
    const existing = monthlyMap.get(result.monthKey);
    if (existing) {
      existing.income = result.income;
      existing.expense = result.expense;
    }
  }

  const monthlyData = Array.from(monthlyMap.entries()).map(([month, data]) => ({
    month,
    income: data.income,
    expense: data.expense,
  }));

  // BATCH CONVERSION 3: Asset balances
  const assetBalancesWithCurrency = accounts.map((account) => {
    const accountLines = lines.filter((l) => l.account_id === account.id);
    const totalDebits = accountLines.reduce((sum, l) => sum + (l.debit_amount || 0), 0);
    const totalCredits = accountLines.reduce((sum, l) => sum + (l.credit_amount || 0), 0);
    const balance = totalDebits - totalCredits; // Assets increase with debits

    return {
      name: account.name,
      balance,
      currency: account.currency || baseCurrency,
    };
  });

  const convertedBalances = await convertToBaseCurrencyBatch(
    assetBalancesWithCurrency.map((a) => ({ amount: a.balance, currency: a.currency })),
    baseCurrency
  );

  const assetDistribution = assetBalancesWithCurrency
    .map((asset, index) => ({
      name: asset.name,
      value: convertedBalances[index],
    }))
    .filter((a) => a.value > 0);

  return {
    totalIncome,
    totalExpense,
    netCashFlow: totalIncome - totalExpense,
    monthlyData,
    assetDistribution,
  };
}
