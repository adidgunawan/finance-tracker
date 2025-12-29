"use client";

import { useState, useEffect } from "react";
import type { Database } from "@/lib/supabase/types";
import {
  getBudgets as serverGetBudgets,
  createBudget as serverCreateBudget,
  updateBudget as serverUpdateBudget,
  deleteBudget as serverDeleteBudget,
  toggleBudgetStatus as serverToggleBudgetStatus,
  getBudgetProgress as serverGetBudgetProgress,
} from "@/actions/budgets";

export type Budget = Database["public"]["Tables"]["budgets"]["Row"] & {
  account?: { id: string; name: string };
  monthly_amounts?: Array<{
    id: string;
    budget_id: string;
    year: number;
    month: number;
    amount: number;
  }>;
};

export interface BudgetProgress {
  budgeted: number;
  actual: number;
  remaining: number;
  percentage: number;
}

export function useBudgets() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBudgets();
  }, []);

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const data = await serverGetBudgets();
      setBudgets(data as Budget[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch budgets");
    } finally {
      setLoading(false);
    }
  };

  const createBudget = async (
    accountId: string,
    budgetType: "fixed_monthly" | "custom_monthly" | "date_range",
    fixedAmount: number | null,
    startDate: string | null,
    endDate: string | null,
    monthlyAmounts: { month: number; year: number; amount: number }[] = []
  ) => {
    try {
      const newBudget = await serverCreateBudget(
        accountId,
        budgetType,
        fixedAmount,
        startDate,
        endDate,
        monthlyAmounts
      );
      await fetchBudgets(); // Refresh list
      return newBudget;
    } catch (err) {
      throw err;
    }
  };

  const updateBudget = async (
    id: string,
    updates: {
      accountId?: string;
      budgetType?: "fixed_monthly" | "custom_monthly" | "date_range";
      fixedAmount?: number | null;
      startDate?: string | null;
      endDate?: string | null;
      isActive?: boolean;
      monthlyAmounts?: { month: number; year: number; amount: number }[];
    }
  ) => {
    try {
      const updatedBudget = await serverUpdateBudget(id, updates);
      await fetchBudgets(); // Refresh list
      return updatedBudget;
    } catch (err) {
      throw err;
    }
  };

  const toggleBudgetStatus = async (id: string) => {
    try {
      const updatedBudget = await serverToggleBudgetStatus(id);
      await fetchBudgets(); // Refresh list
      return updatedBudget;
    } catch (err) {
      throw err;
    }
  };

  const deleteBudget = async (id: string) => {
    try {
      await serverDeleteBudget(id);
      setBudgets((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      throw err;
    }
  };

  const getBudgetProgress = async (
    budgetId: string,
    month: number,
    year: number
  ): Promise<BudgetProgress> => {
    try {
      return await serverGetBudgetProgress(budgetId, month, year);
    } catch (err) {
      throw err;
    }
  };

  return {
    budgets,
    loading,
    error,
    createBudget,
    updateBudget,
    deleteBudget,
    toggleBudgetStatus,
    getBudgetProgress,
    refreshBudgets: fetchBudgets,
  };
}

