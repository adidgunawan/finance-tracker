"use client";

import { Progress } from "@/components/ui/progress";
import { useCurrency } from "@/hooks/useCurrency";

interface BudgetProgressProps {
  budgeted: number;
  actual: number;
  remaining: number;
  percentage: number;
}

export function BudgetProgress({
  budgeted,
  actual,
  remaining,
  percentage,
}: BudgetProgressProps) {
  const { format: formatCurrency } = useCurrency();

  // Determine color based on percentage
  const getProgressColor = () => {
    if (percentage < 80) return "bg-primary";
    if (percentage < 100) return "bg-yellow-500";
    return "bg-destructive";
  };

  const getTextColor = () => {
    if (percentage < 80) return "text-primary";
    if (percentage < 100) return "text-yellow-600";
    return "text-destructive";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Progress</span>
        <span className={`font-semibold ${getTextColor()}`}>
          {percentage.toFixed(1)}%
        </span>
      </div>
      <Progress value={Math.min(percentage, 100)} className="h-2" />
      <div className="grid grid-cols-3 gap-4 text-xs">
        <div>
          <div className="text-muted-foreground">Budgeted</div>
          <div className="font-semibold">{formatCurrency(budgeted)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Actual</div>
          <div className="font-semibold">{formatCurrency(actual)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Remaining</div>
          <div
            className={`font-semibold ${
              remaining >= 0 ? "text-primary" : "text-destructive"
            }`}
          >
            {formatCurrency(Math.abs(remaining))}
          </div>
        </div>
      </div>
    </div>
  );
}

