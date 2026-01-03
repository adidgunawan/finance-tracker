"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { useReports } from "@/hooks/useReports";
import { useAccounts } from "@/hooks/useAccounts";
import type { Database } from "@/lib/supabase/types";
import { getMonthRange, getYearRange, formatDateRange } from "@/lib/utils/dateRange";

type Account = Database["public"]["Tables"]["chart_of_accounts"]["Row"];

interface ReportFiltersProps {
  onApply: () => void;
}

export function ReportFilters({ onApply }: ReportFiltersProps) {
  const { filters, updateFilters, resetFilters } = useReports();
  const { accounts } = useAccounts();
  const [startDate, setStartDate] = useState(filters.startDate || "");
  const [endDate, setEndDate] = useState(filters.endDate || "");
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(
    filters.accountIds || []
  );
  const [selectedTypes, setSelectedTypes] = useState<("income" | "expense" | "transfer")[]>(
    filters.transactionTypes || []
  );

  const handleApply = () => {
    updateFilters({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      accountIds: selectedAccountIds.length > 0 ? selectedAccountIds : undefined,
      transactionTypes: selectedTypes.length > 0 ? selectedTypes : undefined,
    });
    onApply();
  };

  const handleReset = () => {
    setStartDate("");
    setEndDate("");
    setSelectedAccountIds([]);
    setSelectedTypes([]);
    resetFilters();
    onApply();
  };

  const setQuickRange = (range: "month" | "year") => {
    const dateRange = range === "month" ? getMonthRange() : getYearRange();
    setStartDate(dateRange.start.toISOString().split("T")[0]);
    setEndDate(dateRange.end.toISOString().split("T")[0]);
  };

  const toggleAccount = (accountId: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    );
  };

  const toggleType = (type: "income" | "expense" | "transfer") => {
    setSelectedTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Filters</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setQuickRange("month")}>
              This Month
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickRange("year")}>
              This Year
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start-date">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date">End Date</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Transaction Types</Label>
          <div className="flex gap-2 flex-wrap">
            {(["income", "expense", "transfer"] as const).map((type) => (
              <Button
                key={type}
                variant={selectedTypes.includes(type) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleType(type)}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Accounts (Select multiple)</Label>
          <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
            {accounts
              .filter((a) => a.is_active)
              .map((account) => (
                <label
                  key={account.id}
                  className="flex items-center space-x-2 cursor-pointer hover:bg-accent p-1 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedAccountIds.includes(account.id)}
                    onChange={() => toggleAccount(account.id)}
                    className="rounded"
                  />
                  <span className="text-sm">{account.name}</span>
                </label>
              ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleApply} className="flex-1">
            Apply Filters
          </Button>
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
        </div>
      </div>
    </Card>
  );
}


