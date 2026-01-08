"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BudgetDialog } from "@/components/budgets/BudgetDialog";
import { BudgetList } from "@/components/budgets/BudgetList";
import { BudgetMonthlyComparison } from "@/components/budgets/BudgetMonthlyComparison";
import { useBudgets, type Budget } from "@/hooks/useBudgets";
import { useAccounts } from "@/hooks/useAccounts";
import { PlusIcon } from "@radix-ui/react-icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BudgetsClientProps {
  initialBudgets: Budget[];
}

export function BudgetsClient({ initialBudgets }: BudgetsClientProps) {
  const { budgets, createBudget, updateBudget } = useBudgets();
  const { accounts } = useAccounts();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [activeTab, setActiveTab] = useState("list");
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);

  const handleCreate = () => {
    setEditingBudget(null);
    setDialogOpen(true);
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setDialogOpen(true);
  };

  const handleViewComparison = (budget: Budget) => {
    setSelectedBudgetId(budget.id);
    setActiveTab("comparison");
  };

  const handleSave = async (data: {
    accountId: string;
    budgetType: "fixed_monthly" | "custom_monthly" | "date_range";
    fixedAmount: number | null;
    startDate: string | null;
    endDate: string | null;
    monthlyAmounts: { month: number; year: number; amount: number }[];
  }) => {
    if (editingBudget) {
      await updateBudget(editingBudget.id, {
        accountId: data.accountId,
        budgetType: data.budgetType,
        fixedAmount: data.fixedAmount,
        startDate: data.startDate,
        endDate: data.endDate,
        monthlyAmounts: data.monthlyAmounts,
      });
    } else {
      await createBudget(
        data.accountId,
        data.budgetType,
        data.fixedAmount,
        data.startDate,
        data.endDate,
        data.monthlyAmounts
      );
    }
    setDialogOpen(false);
    setEditingBudget(null);
  };

  // Use server data for first render, then switch to query data
  const displayBudgets = budgets.length > 0 ? budgets : initialBudgets;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 pb-24 md:pb-8">
      <div className="max-w-[98%] mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-foreground">Budgets</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Set and track your spending budgets
            </p>
          </div>
          <Button onClick={handleCreate} className="w-full md:w-auto">
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Budget
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="list">Budget List</TabsTrigger>
            {selectedBudgetId && (
              <TabsTrigger value="comparison">Monthly Comparison</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="list">
            <BudgetList onEdit={handleEdit} onViewComparison={handleViewComparison} />
          </TabsContent>

          {selectedBudgetId && (
            <TabsContent value="comparison">
              <BudgetMonthlyComparison budgetId={selectedBudgetId} />
            </TabsContent>
          )}
        </Tabs>

        <BudgetDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          budget={editingBudget}
          accounts={accounts}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}
