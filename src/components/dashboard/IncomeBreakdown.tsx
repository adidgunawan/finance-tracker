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
  Cell
} from "recharts";
import { useCurrency } from "@/hooks/useCurrency";

interface IncomeBreakdownProps {
  data: {
    category: string;
    amount: number;
    percentage: number;
    currency: string;
  }[];
}

const BAR_COLORS = ["#22c55e", "#16a34a", "#15803d", "#166534", "#14532d"];

export function IncomeBreakdown({ data }: IncomeBreakdownProps) {
  const { format: formatCurrency } = useCurrency();

  // Sort by amount descending and take top 5 for cleaner chart
  const chartData = [...data].sort((a, b) => b.amount - a.amount).slice(0, 5);

  if (chartData.length === 0) {
     return (
        <Card className="p-6 h-[400px] flex flex-col items-center justify-center text-muted-foreground">
             No income data for this month
        </Card>
     )
  }

  return (
    <Card className="p-4 md:p-6 flex flex-col h-[400px]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-foreground">
          Income Sources
        </h3>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
            <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
            barSize={32}
            >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
            <XAxis type="number" hide />
            <YAxis 
                type="category" 
                dataKey="category" 
                tick={{ fill: "#71717a", fontSize: 12, fontWeight: 500 }}
                width={100}
                axisLine={false}
                tickLine={false}
            />
            <Tooltip
                cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                borderRadius: "8px",
                border: "1px solid #e4e4e7",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                fontSize: "12px"
                }}
                formatter={(value: number) => formatCurrency(value)}
                itemStyle={{ color: "#09090b" }}
            />
            <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                ))}
            </Bar>
            </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
