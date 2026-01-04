"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useCurrency } from "@/hooks/useCurrency";
import { CategoryDrillDownDialog } from "@/components/dashboard/CategoryDrillDownDialog";
import { cn } from "@/lib/utils";

interface ExpenseBreakdownProps {
  data: {
    category: string;
    amount: number;
    percentage: number;
    currency: string;
  }[];
}

const COLORS = [
  "#ef4444", // Red 500
  "#f97316", // Orange 500
  "#eab308", // Yellow 500
  "#3b82f6", // Blue 500
  "#8b5cf6", // Violet 500
  "#ec4899", // Pink 500
  "#06b6d4", // Cyan 500
  "#14b8a6", // Teal 500
];

export function ExpenseBreakdown({ data }: ExpenseBreakdownProps) {
  const { format: formatCurrency } = useCurrency();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Filter out zero amounts and sort by amount desc
  const chartData = data
    .filter(d => d.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const handleSliceClick = (entry: any) => {
    setSelectedCategory(entry.category);
    setDialogOpen(true);
  };

  if (chartData.length === 0) {
    return (
      <Card className="p-6 h-[400px] flex flex-col items-center justify-center text-muted-foreground">
        No expense data for this month
      </Card>
    );
  }

  return (
    <>
      <Card className="flex flex-col h-[400px] overflow-hidden">
        <div className="p-4 md:p-6 pb-2">
          <h3 className="text-lg font-bold text-foreground">
             Top Expenses
          </h3>
          <p className="text-sm text-muted-foreground">
             Click on a section to view details
          </p>
        </div>
        
        <div className="flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius="50%"
                outerRadius="80%"
                paddingAngle={2}
                dataKey="amount"
                nameKey="category"
                onClick={handleSliceClick}
                className="cursor-pointer outline-none focus:outline-none"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]} 
                    strokeWidth={2}
                    stroke="hsl(var(--card))"
                    className="hover:opacity-80 transition-opacity"
                  />
                ))}
              </Pie>
              <Tooltip 
                 formatter={(value: number) => formatCurrency(value)}
                 contentStyle={{
                   backgroundColor: "rgba(255, 255, 255, 0.95)",
                   borderRadius: "8px",
                   border: "1px solid #e4e4e7",
                   boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                   fontSize: "12px"
                 }}
                 itemStyle={{ color: "#09090b" }}
                 cursor={{ pointerEvents: 'none' }}
              />
              <Legend
                 layout="vertical"
                 verticalAlign="middle"
                 align="right"
                 wrapperStyle={{ paddingRight: '20px' }}
                 content={({ payload }) => (
                   <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                     {payload?.map((entry: any, index: number) => {
                       const item = chartData.find(d => d.category === entry.value);
                       if (!item) return null;
                       return (
                         <div 
                           key={`legend-${index}`} 
                           className="flex items-center justify-between text-xs group cursor-pointer hover:bg-muted/50 p-1 rounded transition-colors"
                           onClick={() => handleSliceClick(item)}
                         >
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="text-muted-foreground font-medium truncate max-w-[90px]" title={item.category}>
                                {item.category}
                              </span>
                            </div>
                            <div className="flex flex-col items-end ml-4">
                                <span className="font-bold text-foreground">
                                   {item.percentage.toFixed(1)}%
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                   {formatCurrency(item.amount)}
                                </span>
                            </div>
                         </div>
                       );
                     })}
                   </div>
                 )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <CategoryDrillDownDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        categoryName={selectedCategory}
      />
    </>
  );
}
