"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BudgetProgress } from "./BudgetProgress";
import { useBudgets } from "@/hooks/useBudgets";
import { useCurrency } from "@/hooks/useCurrency";
import { format } from "date-fns";

interface BudgetMonthlyComparisonProps {
  budgetId: string;
}

export function BudgetMonthlyComparison({ budgetId }: BudgetMonthlyComparisonProps) {
  const { getBudgetProgress } = useBudgets();
  const { format: formatCurrency } = useCurrency();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [progressData, setProgressData] = useState<
    Record<string, { budgeted: number; actual: number; remaining: number; percentage: number }>
  >({});
  const [loading, setLoading] = useState(false);

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  useEffect(() => {
    loadProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgetId, selectedYear]);

  const loadProgress = async () => {
    setLoading(true);
    const progress: Record<string, any> = {};
    
    for (const month of months) {
      try {
        const data = await getBudgetProgress(budgetId, month, selectedYear);
        progress[month] = data;
      } catch (err) {
        console.error(`Failed to load progress for month ${month}:`, err);
        progress[month] = { budgeted: 0, actual: 0, remaining: 0, percentage: 0 };
      }
    }
    
    setProgressData(progress);
    setLoading(false);
  };

  const getMonthName = (month: number) => {
    return format(new Date(selectedYear, month - 1, 1), "MMM");
  };

  const totals = months.reduce(
    (acc, month) => {
      const data = progressData[month] || { budgeted: 0, actual: 0, remaining: 0 };
      return {
        budgeted: acc.budgeted + data.budgeted,
        actual: acc.actual + data.actual,
        remaining: acc.remaining + data.remaining,
      };
    },
    { budgeted: 0, actual: 0, remaining: 0 }
  );

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Monthly Comparison</h3>
        <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Budgeted</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead className="text-right">Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {months.map((month) => {
                const data = progressData[month] || { budgeted: 0, actual: 0, remaining: 0, percentage: 0 };
                return (
                  <TableRow key={month}>
                    <TableCell className="font-medium">{getMonthName(month)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(data.budgeted)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(data.actual)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-semibold ${
                        data.remaining >= 0 ? "text-primary" : "text-destructive"
                      }`}
                    >
                      {formatCurrency(Math.abs(data.remaining))}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              data.percentage < 80
                                ? "bg-primary"
                                : data.percentage < 100
                                ? "bg-yellow-500"
                                : "bg-destructive"
                            }`}
                            style={{ width: `${Math.min(data.percentage, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-12 text-right">
                          {data.percentage.toFixed(0)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="font-bold bg-muted/50">
                <TableCell>Total</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.budgeted)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.actual)}</TableCell>
                <TableCell
                  className={`text-right ${
                    totals.remaining >= 0 ? "text-primary" : "text-destructive"
                  }`}
                >
                  {formatCurrency(Math.abs(totals.remaining))}
                </TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground">
                    {totals.budgeted > 0
                      ? ((totals.actual / totals.budgeted) * 100).toFixed(1)
                      : 0}
                    %
                  </span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}




