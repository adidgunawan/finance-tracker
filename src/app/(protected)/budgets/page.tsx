import { Suspense } from "react";
import { getBudgets } from "@/actions/budgets";
import { BudgetsClient } from "@/components/budgets/BudgetsClient";
import { Card } from "@/components/ui/card";

function BudgetsLoading() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8 pb-24 md:pb-8">
      <div className="max-w-[98%] mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-32 bg-muted animate-pulse rounded" />
            <div className="h-4 w-48 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-10 w-full md:w-40 bg-muted animate-pulse rounded" />
        </div>
        <Card className="p-8 text-center">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ⭐ SERVER COMPONENT - Pre-renders data on server
async function BudgetsServerWrapper() {
  const initialBudgets = await getBudgets();
  
  return <BudgetsClient initialBudgets={initialBudgets || []} />;
}

export default function BudgetsPage() {
  return (
    <Suspense fallback={<BudgetsLoading />}>
      <BudgetsServerWrapper />
    </Suspense>
  );
}
