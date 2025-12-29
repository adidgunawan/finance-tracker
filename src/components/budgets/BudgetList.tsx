"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BudgetProgress } from "./BudgetProgress";
import { useBudgets, type Budget } from "@/hooks/useBudgets";
import { useCurrency } from "@/hooks/useCurrency";
import { TrashIcon, UpdateIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";

interface BudgetListProps {
  onEdit: (budget: Budget) => void;
  onViewComparison?: (budget: Budget) => void;
}

export function BudgetList({ onEdit, onViewComparison }: BudgetListProps) {
  const {
    budgets,
    loading,
    error,
    deleteBudget,
    toggleBudgetStatus,
    getBudgetProgress,
  } = useBudgets();
  const { format: formatCurrency } = useCurrency();
  const [progressData, setProgressData] = useState<
    Record<string, { budgeted: number; actual: number; remaining: number; percentage: number }>
  >({});

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  useEffect(() => {
    // Load progress for all budgets
    const loadProgress = async () => {
      const progress: Record<string, any> = {};
      for (const budget of budgets) {
        try {
          const data = await getBudgetProgress(
            budget.id,
            currentMonth,
            currentYear
          );
          progress[budget.id] = data;
        } catch (err) {
          console.error(`Failed to load progress for budget ${budget.id}:`, err);
        }
      }
      setProgressData(progress);
    };

    if (budgets.length > 0) {
      loadProgress();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgets, currentMonth, currentYear]);

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this budget?")) {
      try {
        await deleteBudget(id);
      } catch (error) {
        alert(error instanceof Error ? error.message : "Failed to delete budget");
      }
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await toggleBudgetStatus(id);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to update budget");
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading budgets...</div>;
  }

  if (error) {
    return <div className="text-destructive">Error: {error}</div>;
  }

  if (budgets.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center text-muted-foreground">
          <p>No budgets yet. Create your first budget to get started.</p>
        </div>
      </Card>
    );
  }

  const getBudgetTypeLabel = (type: string) => {
    switch (type) {
      case "fixed_monthly":
        return "Fixed Monthly";
      case "custom_monthly":
        return "Custom Monthly";
      case "date_range":
        return "Date Range";
      default:
        return type;
    }
  };

  const getBudgetAmount = (budget: Budget) => {
    if (budget.budget_type === "fixed_monthly") {
      return budget.fixed_amount || 0;
    }
    if (budget.budget_type === "date_range") {
      // For date range, we'd need to calculate based on days
      // For now, return 0 or a placeholder
      return 0;
    }
    // For custom_monthly, get current month's amount
    const currentMonthAmount = budget.monthly_amounts?.find(
      (m) => m.month === currentMonth && m.year === currentYear
    );
    return currentMonthAmount?.amount || 0;
  };

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Budgeted</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {budgets.map((budget) => {
            const progress = progressData[budget.id];
            const budgetedAmount = getBudgetAmount(budget);

            return (
              <TableRow key={budget.id}>
                <TableCell className="font-medium">
                  {budget.account?.name || "Unknown"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {getBudgetTypeLabel(budget.budget_type)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {formatCurrency(budgetedAmount)}
                </TableCell>
                <TableCell>
                  {progress ? (
                    <BudgetProgress
                      budgeted={progress.budgeted}
                      actual={progress.actual}
                      remaining={progress.remaining}
                      percentage={progress.percentage}
                    />
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      Loading...
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={budget.is_active ? "default" : "secondary"}
                    className="cursor-pointer"
                    onClick={() => handleToggleStatus(budget.id)}
                  >
                    {budget.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {onViewComparison && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewComparison(budget)}
                        title="View Monthly Comparison"
                      >
                        <MagnifyingGlassIcon className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(budget)}
                    >
                      <UpdateIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(budget.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

