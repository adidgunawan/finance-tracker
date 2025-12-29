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

      // Fetch transactions for current month
      const currentMonthStart = startOfMonth(new Date());
      const currentMonthEnd = endOfMonth(new Date());

      const { data: transactions, error: transError } = await supabase
        .from("transactions")
        .select("*")
        .gte("transaction_date", currentMonthStart.toISOString().split("T")[0])
        .lte("transaction_date", currentMonthEnd.toISOString().split("T")[0]);

      if (transError) throw transError;

      // Calculate current month totals
      const income = transactions
        ?.filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0) || 0;

      const expense = transactions
        ?.filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0) || 0;

      // Fetch last 6 months data
      const sixMonthsAgo = subMonths(new Date(), 5);
      const { data: allTransactions, error: allTransError } = await supabase
        .from("transactions")
        .select("*")
        .gte("transaction_date", sixMonthsAgo.toISOString().split("T")[0]);

      if (allTransError) throw allTransError;

      // Group by month
      const monthlyMap = new Map<string, { income: number; expense: number }>();
      
      for (let i = 0; i < 6; i++) {
        const date = subMonths(new Date(), 5 - i);
        const monthKey = format(date, "MMM yyyy");
        monthlyMap.set(monthKey, { income: 0, expense: 0 });
      }

      allTransactions?.forEach((t) => {
        const monthKey = format(new Date(t.transaction_date), "MMM yyyy");
        const existing = monthlyMap.get(monthKey);
        if (existing) {
          if (t.type === "income") {
            existing.income += t.amount;
          } else if (t.type === "expense") {
            existing.expense += t.amount;
          }
        }
      });

      const monthlyData = Array.from(monthlyMap.entries()).map(([month, data]) => ({
        month,
        income: data.income,
        expense: data.expense,
      }));

      // Fetch asset distribution
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

      // Calculate balance for each asset account
      const assetBalances = accounts?.map((account) => {
        const accountLines = lines?.filter((l) => l.account_id === account.id) || [];
        const totalDebits = accountLines.reduce((sum, l) => sum + (l.debit_amount || 0), 0);
        const totalCredits = accountLines.reduce((sum, l) => sum + (l.credit_amount || 0), 0);
        const balance = totalDebits - totalCredits; // Assets increase with debits

        return {
          name: account.name,
          value: balance,
        };
      }).filter((a) => a.value > 0) || [];

      setData({
        totalIncome: income,
        totalExpense: expense,
        netCashFlow: income - expense,
        monthlyData,
        assetDistribution: assetBalances,
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
