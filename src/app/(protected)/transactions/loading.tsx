export default function Loading() {
  return (
    <div className="h-[calc(100vh-4rem)] p-4 md:px-8 md:py-4 pb-24 md:pb-4 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded"></div>
        <div className="h-10 w-32 bg-muted animate-pulse rounded"></div>
      </div>
      
      <div className="flex-1 flex flex-col">
        <div className="h-12 w-full bg-muted animate-pulse rounded mb-4"></div>
        <div className="flex-1 bg-muted animate-pulse rounded"></div>
      </div>
    </div>
  );
}
