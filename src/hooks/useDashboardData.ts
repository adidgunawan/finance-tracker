"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
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

export function useDashboardData() {
  const [data, setData] = useState<DashboardData>({
    totalIncome: 0,
    totalExpense: 0,
    netCashFlow: 0,
    monthlyData: [],
    assetDistribution: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Get user's base currency
      const { data: settingsData, error: settingsError } = await supabase
        .from("settings")
        .select("default_currency")
        .maybeSingle();
      
      const baseCurrency = (settingsData as { default_currency: string } | null)?.default_currency || "IDR";

      // Fetch transactions for current month
      const currentMonthStart = startOfMonth(new Date());
      const currentMonthEnd = endOfMonth(new Date());

      const { data: transactions, error: transError } = await supabase
        .from("transactions")
        .select("*")
        .gte("transaction_date", currentMonthStart.toISOString().split("T")[0])
        .lte("transaction_date", currentMonthEnd.toISOString().split("T")[0]);

      if (transError) throw transError;

      // Calculate current month totals with currency conversion
      const typedTransactions = (transactions || []) as Transaction[];
      
      // Convert all transaction amounts to base currency
      const convertedIncomes = await Promise.all(
        typedTransactions
          .filter((t) => t.type === "income")
          .map(async (t) => {
            try {
              const response = await fetch("/api/currency/convert", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  amount: t.amount,
                  fromCurrency: t.currency || baseCurrency,
                  toCurrency: baseCurrency,
                }),
              });
              if (!response.ok) {
                // Unsupported currency - use original amount
                return t.amount;
              }
              const result = await response.json();
              return result.convertedAmount || t.amount;
            } catch (error) {
              console.warn(`Conversion failed for income transaction, using original amount:`, error);
              return t.amount;
            }
          })
      );

      const convertedExpenses = await Promise.all(
        typedTransactions
          .filter((t) => t.type === "expense")
          .map(async (t) => {
            try {
              const response = await fetch("/api/currency/convert", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  amount: t.amount,
                  fromCurrency: t.currency || baseCurrency,
                  toCurrency: baseCurrency,
                }),
              });
              if (!response.ok) {
                // Unsupported currency - use original amount
                return t.amount;
              }
              const result = await response.json();
              return result.convertedAmount || t.amount;
            } catch (error) {
              console.warn(`Conversion failed for expense transaction, using original amount:`, error);
              return t.amount;
            }
          })
      );

      const income = convertedIncomes.reduce((sum, amt) => sum + amt, 0);
      const expense = convertedExpenses.reduce((sum, amt) => sum + amt, 0);

      // Fetch last 6 months data
      const sixMonthsAgo = subMonths(new Date(), 5);
      const { data: allTransactions, error: allTransError } = await supabase
        .from("transactions")
        .select("*")
        .gte("transaction_date", sixMonthsAgo.toISOString().split("T")[0]);

      if (allTransError) throw allTransError;

      const typedAllTransactions = (allTransactions || []) as Transaction[];

      // Group by month with currency conversion
      const monthlyMap = new Map<string, { income: number; expense: number }>();
      
      for (let i = 0; i < 6; i++) {
        const date = subMonths(new Date(), 5 - i);
        const monthKey = format(date, "MMM yyyy");
        monthlyMap.set(monthKey, { income: 0, expense: 0 });
      }

      // Convert all historical transactions to base currency
      for (const t of typedAllTransactions) {
        const monthKey = format(new Date(t.transaction_date), "MMM yyyy");
        const existing = monthlyMap.get(monthKey);
        
        if (existing) {
          try {
            const response = await fetch("/api/currency/convert", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                amount: t.amount,
                fromCurrency: t.currency || baseCurrency,
                toCurrency: baseCurrency,
              }),
            });
            if (!response.ok) {
              // Unsupported currency - use original amount
              const convertedAmount = t.amount;
              if (t.type === "income") {
                existing.income += convertedAmount;
              } else if (t.type === "expense") {
                existing.expense += convertedAmount;
              }
              continue;
            }
            const result = await response.json();
            const convertedAmount = result.convertedAmount || t.amount;

            if (t.type === "income") {
              existing.income += convertedAmount;
            } else if (t.type === "expense") {
              existing.expense += convertedAmount;
            }
          } catch (error) {
            console.warn(`Conversion failed for historical transaction, using original amount:`, error);
            // Use original amount on error
            if (t.type === "income") {
              existing.income += t.amount;
            } else if (t.type === "expense") {
              existing.expense += t.amount;
            }
          }
        }
      }

      const monthlyData = Array.from(monthlyMap.entries()).map(([month, data]) => ({
        month,
        income: data.income,
        expense: data.expense,
      }));

      // Fetch asset distribution with currency conversion
      const { data: accounts, error: accountsError } = await supabase
        .from("chart_of_accounts")
        .select("*")
        .eq("type", "asset")
        .eq("is_active", true);

      if (accountsError) throw accountsError;

      const { data: lines, error: linesError } = await supabase
        .from("transaction_lines")
        .select("*");

      if (linesError) throw linesError;

      // Calculate balance for each asset account and convert to base currency
      const typedAccounts = (accounts || []) as Account[];
      const typedLines = (lines || []) as TransactionLine[];
      
      const assetBalances = await Promise.all(
        typedAccounts.map(async (account) => {
          const accountLines = typedLines.filter((l) => l.account_id === account.id);
          const totalDebits = accountLines.reduce((sum, l) => sum + (l.debit_amount || 0), 0);
          const totalCredits = accountLines.reduce((sum, l) => sum + (l.credit_amount || 0), 0);
          const balance = totalDebits - totalCredits; // Assets increase with debits

          // Convert balance to base currency
          try {
            const response = await fetch("/api/currency/convert", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                amount: balance,
                fromCurrency: account.currency || baseCurrency,
                toCurrency: baseCurrency,
              }),
            });
            if (!response.ok) {
              // Unsupported currency - use original balance
              return {
                name: account.name,
                value: balance,
              };
            }
            const result = await response.json();
            const convertedBalance = result.convertedAmount || balance;

            return {
              name: account.name,
              value: convertedBalance,
            };
          } catch (error) {
            console.warn(`Conversion failed for asset ${account.name}, using original balance:`, error);
            return {
              name: account.name,
              value: balance,
            };
          }
        })
      );

      setData({
        totalIncome: income,
        totalExpense: expense,
        netCashFlow: income - expense,
        monthlyData,
        assetDistribution: assetBalances.filter((a) => a.value > 0),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch dashboard data");
    } finally {
      setLoading(false);
    }
  };

  return {
    data,
    loading,
    error,
    refetch: fetchDashboardData,
  };
}
