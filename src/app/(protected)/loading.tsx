import { Suspense } from "react";

export default function DashboardLoading() {
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
