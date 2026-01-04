export default function Loading() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-[98%] mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted animate-pulse rounded"></div>
            <div className="h-4 w-64 bg-muted animate-pulse rounded"></div>
          </div>
          <div className="h-10 w-32 bg-muted animate-pulse rounded"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-48 bg-muted animate-pulse rounded"></div>
          <div className="h-48 bg-muted animate-pulse rounded"></div>
          <div className="h-48 bg-muted animate-pulse rounded"></div>
          <div className="h-48 bg-muted animate-pulse rounded"></div>
        </div>
      </div>
    </div>
  );
}
