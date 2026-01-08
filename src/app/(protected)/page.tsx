import { Suspense } from "react";
import { getDashboardInsights } from "@/actions/dashboard-insights";
import { DashboardSummaryCards } from "@/components/dashboard/DashboardSummaryCards";
import { ExpenseBreakdown } from "@/components/dashboard/ExpenseBreakdown";
import { IncomeBreakdown } from "@/components/dashboard/IncomeBreakdown";
import { DailyTrendChart } from "@/components/dashboard/DailyTrendChart";
import { MonthlyComparisonChart } from "@/components/dashboard/MonthlyComparisonChart";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

// ⭐ STREAMING: Individual loading skeletons for each section
function SummaryCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="p-6">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-32 mb-1" />
          <Skeleton className="h-3 w-20" />
        </Card>
      ))}
    </div>
  );
}

function ChartSkeleton({ className = "" }: { className?: string }) {
  return (
    <Card className={`p-6 ${className}`}>
      <Skeleton className="h-6 w-32 mb-4" />
      <Skeleton className="h-[300px] w-full" />
    </Card>
  );
}

function BreakdownSkeleton() {
  return (
    <Card className="p-6">
      <Skeleton className="h-6 w-32 mb-4" />
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </Card>
  );
}

// ⭐ STREAMING: Separate async components for each section
async function DashboardSummarySection() {
  const data = await getDashboardInsights();
  return <DashboardSummaryCards data={data.financialOverview} />;
}

async function DashboardChartsSection() {
  const data = await getDashboardInsights();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <DailyTrendChart data={data.dailyTrend} />
      </div>
      <div>
        <MonthlyComparisonChart data={data.monthlyComparison} />
      </div>
    </div>
  );
}

async function DashboardBreakdownSection() {
  const data = await getDashboardInsights();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ExpenseBreakdown data={data.expenseBreakdown} />
      <IncomeBreakdown data={data.incomeBreakdown} />
    </div>
  );
}

// ⭐ MAIN PAGE: Progressive rendering with Suspense
export default function DashboardPage() {
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

      {/* Summary Cards - Loads first */}
      <Suspense fallback={<SummaryCardsSkeleton />}>
        <DashboardSummarySection />
      </Suspense>

      {/* Charts - Loads second */}
      <Suspense fallback={
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ChartSkeleton className="lg:col-span-2" />
          <ChartSkeleton />
        </div>
      }>
        <DashboardChartsSection />
      </Suspense>

      {/* Breakdowns - Loads third */}
      <Suspense fallback={
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <BreakdownSkeleton />
          <BreakdownSkeleton />
        </div>
      }>
        <DashboardBreakdownSection />
      </Suspense>
    </div>
  );
}
