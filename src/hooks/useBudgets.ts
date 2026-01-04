"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();

  // Fetch budgets with TanStack Query
  const {
    data: budgets = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ["budgets"],
    queryFn: async () => {
      const data = await serverGetBudgets();
      return (data as Budget[]) || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const error = queryError instanceof Error ? queryError.message : null;

  // Create budget mutation
  const { mutateAsync: createBudgetMutation } = useMutation({
    mutationFn: async (params: {
      accountId: string;
      budgetType: "fixed_monthly" | "custom_monthly" | "date_range";
      fixedAmount: number | null;
      startDate: string | null;
      endDate: string | null;
      monthlyAmounts: { month: number; year: number; amount: number }[];
    }) => {
      return await serverCreateBudget(
        params.accountId,
        params.budgetType,
        params.fixedAmount,
        params.startDate,
        params.endDate,
        params.monthlyAmounts
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });

  // Update budget mutation
  const { mutateAsync: updateBudgetMutation } = useMutation({
    mutationFn: async (params: {
      id: string;
      updates: {
        accountId?: string;
        budgetType?: "fixed_monthly" | "custom_monthly" | "date_range";
        fixedAmount?: number | null;
        startDate?: string | null;
        endDate?: string | null;
        isActive?: boolean;
        monthlyAmounts?: { month: number; year: number; amount: number }[];
      };
    }) => {
      return await serverUpdateBudget(params.id, params.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });

  // Toggle budget status mutation
  const { mutateAsync: toggleBudgetStatusMutation } = useMutation({
    mutationFn: serverToggleBudgetStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });

  // Delete budget mutation
  const { mutateAsync: deleteBudgetMutation } = useMutation({
    mutationFn: serverDeleteBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });

  // Wrapper functions to match existing API
  const createBudget = async (
    accountId: string,
    budgetType: "fixed_monthly" | "custom_monthly" | "date_range",
    fixedAmount: number | null,
    startDate: string | null,
    endDate: string | null,
    monthlyAmounts: { month: number; year: number; amount: number }[] = []
  ) => {
    return createBudgetMutation({
      accountId,
      budgetType,
      fixedAmount,
      startDate,
      endDate,
      monthlyAmounts,
    });
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
    return updateBudgetMutation({ id, updates });
  };

  const toggleBudgetStatus = async (id: string) => {
    return toggleBudgetStatusMutation(id);
  };

  const deleteBudget = async (id: string) => {
    return deleteBudgetMutation(id);
  };

  const getBudgetProgress = async (
    budgetId: string,
    month: number,
    year: number
  ): Promise<BudgetProgress> => {
    return await serverGetBudgetProgress(budgetId, month, year);
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
    refreshBudgets: refetch,
  };
}
