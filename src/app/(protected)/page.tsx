import { Suspense } from "react";
import { CashFlowSummary } from "@/components/dashboard/CashFlowSummary";
import { MonthlyTrendChart } from "@/components/dashboard/MonthlyTrendChart";
import { AssetDistributionChart } from "@/components/dashboard/AssetDistributionChart";
import { getDashboardData } from "@/actions/dashboard";

// Loading skeleton component
function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-[98%] mx-auto space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-2"></div>
          <div className="h-4 bg-muted rounded w-64"></div>
        </div>
        <div className="grid grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted rounded animate-pulse"></div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="h-80 bg-muted rounded animate-pulse"></div>
          <div className="h-80 bg-muted rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}

// Server Component - data fetched on server, cached, instant navigation
export default async function DashboardPage() {
  // Fetch data on server - cached with React cache()
  const data = await getDashboardData();

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

