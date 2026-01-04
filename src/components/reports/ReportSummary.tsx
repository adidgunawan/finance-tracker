"use client";

import { Card } from "@/components/ui/card";
import { useCurrency } from "@/hooks/useCurrency";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import { formatDateRange, getDateRangeISO } from "@/lib/utils/dateRange";
import type { ReportFilters } from "@/actions/reports";

interface ReportSummaryProps {
  totalIncome: number;
  totalExpense: number;
  transactionCount: number;
  filters: ReportFilters;
}

export function ReportSummary({
  totalIncome,
  totalExpense,
  transactionCount,
  filters,
}: ReportSummaryProps) {
  const { format: formatCurrency } = useCurrency();
  const { baseCurrency } = useCurrencyConversion();
  const net = totalIncome - totalExpense;

  const getDateRangeText = () => {
    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate);
      const end = new Date(filters.endDate);
      return formatDateRange({ start, end });
    }
    return "All time";
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground text-center">
        All amounts converted to {baseCurrency} (estimated)
      </p>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Total Income</div>
        <div className="text-2xl font-bold text-primary mt-1">
          {formatCurrency(totalIncome)}
        </div>
      </Card>
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Total Expense</div>
        <div className="text-2xl font-bold text-destructive mt-1">
          {formatCurrency(totalExpense)}
        </div>
      </Card>
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Net</div>
        <div
          className={`text-2xl font-bold mt-1 ${
            net >= 0 ? "text-primary" : "text-destructive"
          }`}
        >
          {formatCurrency(Math.abs(net))}
        </div>
      </Card>
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Transactions</div>
        <div className="text-2xl font-bold mt-1">{transactionCount}</div>
      </Card>
      <Card className="p-4 md:col-span-4">
        <div className="text-sm text-muted-foreground">Date Range</div>
        <div className="text-sm font-medium mt-1">{getDateRangeText()}</div>
      </Card>
    </div>
    </div>
  );
}




