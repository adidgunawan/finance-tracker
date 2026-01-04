"use client";

import { Card } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useCurrency } from "@/hooks/useCurrency";

interface MonthlyComparisonChartProps {
  data: {
    income: { current: number; previous: number };
    expense: { current: number; previous: number };
  };
}

export function MonthlyComparisonChart({ data }: MonthlyComparisonChartProps) {
  const { format: formatCurrency } = useCurrency();

  const chartData = [
    {
      name: "Income",
      current: data.income.current,
      previous: data.income.previous,
    },
    {
      name: "Expenses",
      current: data.expense.current,
      previous: data.expense.previous,
    },
  ];

  // Logic to generate insight text
  const expenseDiff = data.expense.current - data.expense.previous;
  const expensePct = data.expense.previous === 0 ? 100 : (expenseDiff / data.expense.previous) * 100;
  
  const getInsight = () => {
    if (expenseDiff > 0) {
       return `Your expenses increased by ${Math.abs(expensePct).toFixed(1)}% compared to last month.`;
    } else if (expenseDiff < 0) {
       return `Your expenses decreased by ${Math.abs(expensePct).toFixed(1)}% compared to last month. Good job!`;
    } else {
       return `Your expenses are the same as last month.`;
    }
  };

  return (
    <Card className="p-4 md:p-6 flex flex-col h-[400px]">
      <div className="flex flex-col mb-4">
        <h3 className="text-lg font-bold text-foreground">
          Monthly Comparison
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
            {getInsight()}
        </p>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          barGap={8}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
          <XAxis 
             dataKey="name" 
             tick={{ fill: "#71717a", fontSize: 13, fontWeight: 600 }}
             axisLine={false}
             tickLine={false}
          />
          <YAxis 
             hide 
          />
          <Tooltip 
             formatter={(value: number) => formatCurrency(value)}
             contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
             }}
          />
          <Legend />
          <Bar 
            dataKey="previous" 
            name="Last Month" 
            fill="#e4e4e7" // Zinc 200 (Neutral)
            radius={[4, 4, 0, 0]}
          />
          <Bar 
            dataKey="current" 
            name="This Month" 
            fill="#3b82f6" // Blue 500
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
