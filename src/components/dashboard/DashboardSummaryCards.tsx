"use client";

import { Card } from "@/components/ui/card";
import { ArrowUpIcon, ArrowDownIcon } from "@radix-ui/react-icons";
import { Wallet, TrendingUp, TrendingDown, PiggyBank } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { cn } from "@/lib/utils";

interface DashboardSummaryCardsProps {
  data: {
    totalBalance: number;
    totalIncome: number;
    totalExpense: number;
    netCashFlow: number;
    incomeChangePct: number;
    expenseChangePct: number;
  };
}

export function DashboardSummaryCards({ data }: DashboardSummaryCardsProps) {
  const { format: formatCurrency } = useCurrency();

  const cards = [
    {
      label: "Total Balance",
      value: data.totalBalance,
      icon: Wallet,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      description: "Net Worth Snapshot",
      trend: null
    },
    {
      label: "Net Cash Flow",
      value: data.netCashFlow,
      // Icon depends on positive/negative
      icon: PiggyBank,
      color: data.netCashFlow >= 0 ? "text-emerald-500" : "text-rose-500",
      bg: data.netCashFlow >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10",
      description: "Income - Expenses",
      trend: null
    },
    {
      label: "Income",
      value: data.totalIncome,
      icon: TrendingUp,
      color: "text-green-500",
      bg: "bg-green-500/10",
      description: "This Month",
      trend: data.incomeChangePct,
      trendLabel: "vs last month"
    },
    {
      label: "Expenses",
      value: data.totalExpense,
      icon: TrendingDown,
      color: "text-red-500",
      bg: "bg-red-500/10",
      description: "This Month",
      trend: data.expenseChangePct,
      trendLabel: "vs last month",
      isExpense: true
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <Card key={index} className="p-4 md:p-6 flex flex-col justify-between overflow-hidden relative">
          <div className="flex justify-between items-start mb-2">
            <div className={cn("p-2 rounded-lg", card.bg)}>
              <card.icon className={cn("w-5 h-5", card.color)} />
            </div>
            {card.trend !== null && (
              <div
                className={cn(
                  "flex items-center text-xs font-medium px-2 py-1 rounded-full",
                  card.isExpense
                    ? card.trend > 0
                      ? "bg-red-500/10 text-red-600"
                      : "bg-green-500/10 text-green-600"
                    : card.trend > 0
                    ? "bg-green-500/10 text-green-600"
                    : "bg-red-500/10 text-red-600"
                )}
              >
                {card.trend > 0 ? (
                  <ArrowUpIcon className="w-3 h-3 mr-1" />
                ) : (
                  <ArrowDownIcon className="w-3 h-3 mr-1" />
                )}
                {Math.abs(card.trend).toFixed(1)}%
              </div>
            )}
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              {card.label}
            </h3>
            <div className="text-2xl font-bold tracking-tight">
              {formatCurrency(card.value)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {card.description}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}
