"use client";

import { CashFlowSummary } from "@/components/dashboard/CashFlowSummary";
import { MonthlyTrendChart } from "@/components/dashboard/MonthlyTrendChart";
import { AssetDistributionChart } from "@/components/dashboard/AssetDistributionChart";
import { useDashboardData } from "@/hooks/useDashboardData";

export default function DashboardPage() {
  const { data, loading, error } = useDashboardData();

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-[98%] mx-auto">
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-[98%] mx-auto">
          <p className="text-destructive">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-[98%] mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of your financial status
          </p>
        </div>

        <CashFlowSummary
          totalIncome={data.totalIncome}
          totalExpense={data.totalExpense}
          netCashFlow={data.netCashFlow}
        />

        <div className="grid grid-cols-2 gap-6">
          <MonthlyTrendChart data={data.monthlyData} />
          <AssetDistributionChart data={data.assetDistribution} />
        </div>
      </div>
    </div>
  );
}
