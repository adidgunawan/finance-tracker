"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Database } from "@/lib/supabase/types";
import { PlusIcon, TrashIcon } from "@radix-ui/react-icons";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/useCurrency";

type Budget = Database["public"]["Tables"]["budgets"]["Row"] & {
  account?: { id: string; name: string };
  monthly_amounts?: Array<{
    id: string;
    budget_id: string;
    year: number;
    month: number;
    amount: number;
  }>;
};

type Account = Database["public"]["Tables"]["chart_of_accounts"]["Row"];

interface BudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget?: Budget | null;
  accounts: Account[];
  onSave: (data: {
    accountId: string;
    budgetType: "fixed_monthly" | "custom_monthly" | "date_range";
    fixedAmount: number | null;
    startDate: string | null;
    endDate: string | null;
    monthlyAmounts: { month: number; year: number; amount: number }[];
  }) => Promise<void>;
}

interface MonthlyAmount {
  id: string;
  month: number;
  year: number;
  amount: string;
}

export function BudgetDialog({
  open,
  onOpenChange,
  budget,
  accounts,
  onSave,
}: BudgetDialogProps) {
  const { format: formatCurrency } = useCurrency();
  const [accountId, setAccountId] = useState("");
  const [budgetType, setBudgetType] = useState<
    "fixed_monthly" | "custom_monthly" | "date_range"
  >("fixed_monthly");
  const [fixedAmount, setFixedAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [monthlyAmounts, setMonthlyAmounts] = useState<MonthlyAmount[]>([]);
  const [loading, setLoading] = useState(false);

  const expenseAccounts = accounts.filter(
    (a) => a.type === "expense" && a.is_active
  );

  useEffect(() => {
    if (budget && open) {
      setAccountId(budget.account_id);
      setBudgetType(budget.budget_type);
      setFixedAmount(budget.fixed_amount?.toString() || "");
      setStartDate(budget.start_date || "");
      setEndDate(budget.end_date || "");
      
      if (budget.monthly_amounts && budget.monthly_amounts.length > 0) {
        setMonthlyAmounts(
          budget.monthly_amounts.map((m) => ({
            id: m.id || `${m.year}-${m.month}`,
            month: m.month,
            year: m.year,
            amount: m.amount.toString(),
          }))
        );
      } else {
        // Initialize with current year's months
        const currentYear = new Date().getFullYear();
        setMonthlyAmounts(
          Array.from({ length: 12 }, (_, i) => ({
            id: `${currentYear}-${i + 1}`,
            month: i + 1,
            year: currentYear,
            amount: "",
          }))
        );
      }
    } else if (open) {
      // Reset form for new budget
      setAccountId("");
      setBudgetType("fixed_monthly");
      setFixedAmount("");
      setStartDate("");
      setEndDate("");
      setTotalAmount("");
      const currentYear = new Date().getFullYear();
      setMonthlyAmounts(
        Array.from({ length: 12 }, (_, i) => ({
          id: `${currentYear}-${i + 1}`,
          month: i + 1,
          year: currentYear,
          amount: "",
        }))
      );
    }
  }, [budget, open]);

  const addMonthlyAmount = () => {
    const currentYear = new Date().getFullYear();
    setMonthlyAmounts([
      ...monthlyAmounts,
      {
        id: Date.now().toString(),
        month: 1,
        year: currentYear,
        amount: "",
      },
    ]);
  };

  const removeMonthlyAmount = (id: string) => {
    setMonthlyAmounts(monthlyAmounts.filter((m) => m.id !== id));
  };

  const updateMonthlyAmount = (
    id: string,
    field: "month" | "year" | "amount",
    value: string | number
  ) => {
    setMonthlyAmounts(
      monthlyAmounts.map((m) =>
        m.id === id ? { ...m, [field]: value } : m
      )
    );
  };

  const handleSave = async () => {
    if (!accountId) {
      toast.error("Please select an account");
      return;
    }

    if (budgetType === "fixed_monthly") {
      if (!fixedAmount || parseFloat(fixedAmount) <= 0) {
        toast.error("Please enter a valid fixed monthly amount");
        return;
      }
    } else if (budgetType === "date_range") {
      if (!startDate || !endDate) {
        toast.error("Please select start and end dates");
        return;
      }
      if (!totalAmount || parseFloat(totalAmount) <= 0) {
        toast.error("Please enter a valid total amount");
        return;
      }
      if (new Date(startDate) > new Date(endDate)) {
        toast.error("End date must be after start date");
        return;
      }
    } else if (budgetType === "custom_monthly") {
      const validAmounts = monthlyAmounts.filter(
        (m) => m.amount && parseFloat(m.amount) > 0
      );
      if (validAmounts.length === 0) {
        toast.error("Please enter at least one monthly amount");
        return;
      }
    }

    setLoading(true);
    try {
      await onSave({
        accountId,
        budgetType,
        fixedAmount:
          budgetType === "fixed_monthly" ? parseFloat(fixedAmount) : null,
        startDate: budgetType === "date_range" ? startDate : null,
        endDate: budgetType === "date_range" ? endDate : null,
        monthlyAmounts:
          budgetType === "custom_monthly"
            ? monthlyAmounts
                .filter((m) => m.amount && parseFloat(m.amount) > 0)
                .map((m) => ({
                  month: m.month,
                  year: m.year,
                  amount: parseFloat(m.amount),
                }))
            : [],
      });
      toast.success(budget ? "Budget updated successfully" : "Budget created successfully");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save budget");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {budget ? "Edit Budget" : "Create Budget"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="account">Account *</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Select expense account" />
              </SelectTrigger>
              <SelectContent>
                {expenseAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget-type">Budget Type *</Label>
            <Select
              value={budgetType}
              onValueChange={(value) =>
                setBudgetType(
                  value as "fixed_monthly" | "custom_monthly" | "date_range"
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed_monthly">Fixed Monthly</SelectItem>
                <SelectItem value="custom_monthly">Custom Monthly</SelectItem>
                <SelectItem value="date_range">Date Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {budgetType === "fixed_monthly" && (
            <div className="space-y-2">
              <Label htmlFor="fixed-amount">Monthly Amount *</Label>
              <Input
                id="fixed-amount"
                type="number"
                step="0.01"
                min="0"
                value={fixedAmount}
                onChange={(e) => setFixedAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          )}

          {budgetType === "date_range" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Start Date *</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date *</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="total-amount">Total Amount *</Label>
                <Input
                  id="total-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </>
          )}

          {budgetType === "custom_monthly" && (
            <div className="space-y-2">
              <Label>Monthly Amounts</Label>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[30%]">Month</TableHead>
                      <TableHead className="w-[30%]">Year</TableHead>
                      <TableHead className="w-[30%]">Amount</TableHead>
                      <TableHead className="w-[10%]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyAmounts.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Select
                            value={item.month.toString()}
                            onValueChange={(value) =>
                              updateMonthlyAmount(item.id, "month", parseInt(value))
                            }
                          >
                            <SelectTrigger className="border-0 focus:ring-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 12 }, (_, i) => (
                                <SelectItem key={i + 1} value={(i + 1).toString()}>
                                  {new Date(2000, i).toLocaleString("default", {
                                    month: "long",
                                  })}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.year}
                            onChange={(e) =>
                              updateMonthlyAmount(
                                item.id,
                                "year",
                                parseInt(e.target.value) || item.year
                              )
                            }
                            className="border-0 focus-visible:ring-1"
                            min="2000"
                            max="2100"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.amount}
                            onChange={(e) =>
                              updateMonthlyAmount(item.id, "amount", e.target.value)
                            }
                            placeholder="0.00"
                            className="border-0 focus-visible:ring-1"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMonthlyAmount(item.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={addMonthlyAmount}
                className="w-full"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Month
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || !accountId}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

