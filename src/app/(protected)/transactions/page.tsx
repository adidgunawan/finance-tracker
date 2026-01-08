import { Suspense } from "react";
import { getTransactions } from "@/actions/transactions";
import { TransactionsClient } from "@/components/transactions/TransactionsClient";
import { Card } from "@/components/ui/card";

function TransactionsLoading() {
  return (
    <div className="container mx-auto px-4 md:px-8 py-4 md:py-6 pb-24 md:pb-8">
      <div className="space-y-6">
        <div className="flex items-end justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            <div className="h-4 w-64 bg-muted animate-pulse rounded" />
          </div>
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
async function TransactionsServerWrapper() {
  // Fetch initial data on the server
  const initialData = await getTransactions(1, 20);
  
  return <TransactionsClient initialData={initialData} />;
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<TransactionsLoading />}>
      <TransactionsServerWrapper />
    </Suspense>
  );
}
