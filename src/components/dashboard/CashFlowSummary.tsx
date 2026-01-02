"use client";

import { Card } from "@/components/ui/card";
import { ArrowUpIcon, ArrowDownIcon, DashIcon } from "@radix-ui/react-icons";
import { useCurrency } from "@/hooks/useCurrency";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";

interface CashFlowSummaryProps {
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
}

export function CashFlowSummary({
  totalIncome,
  totalExpense,
  netCashFlow,
}: CashFlowSummaryProps) {
  const { format: formatCurrency } = useCurrency();
  const { baseCurrency } = useCurrencyConversion();

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground text-center">
        All amounts converted to {baseCurrency} (estimated)
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="p-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ArrowUpIcon className="w-24 h-24 text-primary" />
        </div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Income</p>
            <p className="text-3xl font-bold text-foreground mt-2">
              {formatCurrency(totalIncome)}
            </p>
          </div>
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center border border-primary/20">
            <ArrowUpIcon className="w-6 h-6 text-primary" />
          </div>
        </div>
      </Card>

      <Card className="p-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ArrowDownIcon className="w-24 h-24 text-destructive" />
        </div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Expense</p>
            <p className="text-3xl font-bold text-foreground mt-2">
              {formatCurrency(totalExpense)}
            </p>
          </div>
          <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center border border-destructive/20">
            <ArrowDownIcon className="w-6 h-6 text-destructive" />
          </div>
        </div>
      </Card>

      <Card className="p-6 relative overflow-hidden group">
         <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <DashIcon className={`w-24 h-24 ${netCashFlow >= 0 ? "text-primary" : "text-destructive"}`} />
        </div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Net Cash Flow</p>
            <p
              className={`text-3xl font-bold mt-2 ${
                netCashFlow >= 0 ? "text-primary" : "text-destructive"
              }`}
            >
              {netCashFlow >= 0 ? '' : '-'}{formatCurrency(Math.abs(netCashFlow))}
            </p>
          </div>
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center border ${
              netCashFlow >= 0
                ? "bg-primary/20 border-primary/20"
                : "bg-destructive/20 border-destructive/20"
            }`}
          >
            <DashIcon
              className={`w-6 h-6 ${
                netCashFlow >= 0 ? "text-primary" : "text-destructive"
              }`}
            />
          </div>
        </div>
      </Card>
      </div>
    </div>
  );
}
