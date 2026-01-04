import { Suspense } from "react";
import { getDashboardInsights } from "@/actions/dashboard-insights";
import { DashboardSummaryCards } from "@/components/dashboard/DashboardSummaryCards";
import { ExpenseBreakdown } from "@/components/dashboard/ExpenseBreakdown";
import { IncomeBreakdown } from "@/components/dashboard/IncomeBreakdown";
import { DailyTrendChart } from "@/components/dashboard/DailyTrendChart";
import { MonthlyComparisonChart } from "@/components/dashboard/MonthlyComparisonChart";
import { DashboardTransactionTable } from "@/components/dashboard/DashboardTransactionTable";
import { Skeleton } from "@/components/ui/skeleton";

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-[350px] lg:col-span-2 rounded-xl" />
        <Skeleton className="h-[350px] rounded-xl" />
      </div>

      {/* Breakdown Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-[400px] rounded-xl" />
        <Skeleton className="h-[400px] rounded-xl" />
      </div>

      {/* Transactions */}
      <Skeleton className="h-[400px] w-full rounded-xl" />
    </div>
  );
}

export default async function DashboardPage() {
  const data = await getDashboardInsights();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-8 pb-24">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Financial Command Center
        </h1>
        <p className="text-muted-foreground mt-1">
          Your financial health at a glance
        </p>
      </div>

      <DashboardSummaryCards data={data.financialOverview} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DailyTrendChart data={data.dailyTrend} />
        </div>
        <div>
          <MonthlyComparisonChart data={data.monthlyComparison} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ExpenseBreakdown data={data.expenseBreakdown} />
        <IncomeBreakdown data={data.incomeBreakdown} />
      </div>

      <DashboardTransactionTable transactions={data.recentTransactions} />
    </div>
  );
}

