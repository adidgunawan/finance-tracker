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

interface MonthlyTrendChartProps {
  data: {
    month: string;
    income: number;
    expense: number;
  }[];
}

export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  const { format: formatCurrency, symbol } = useCurrency();

  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold text-foreground mb-6">
        Monthly Trends
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} barGap={8}>
          <defs>
            <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0.3}/>
            </linearGradient>
            <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.3}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
          <XAxis
            dataKey="month"
            tick={{ fill: "#71717a", fontSize: 12, fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            dy={10}
          />
          <YAxis
            tick={{ fill: "#71717a", fontSize: 12, fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `${symbol}${value}`}
          />
          <Tooltip
            cursor={{ fill: 'rgba(0,0,0,0.02)' }}
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.8)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.5)",
              borderRadius: "12px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              padding: "12px"
            }}
            labelStyle={{ color: "#18181b", fontWeight: 600, marginBottom: "8px" }}
          />
          <Legend
            wrapperStyle={{ paddingTop: "20px" }}
            iconType="circle"
            formatter={(value) => <span className="text-sm font-medium text-muted-foreground ml-1">{value}</span>}
          />
          <Bar 
            dataKey="income" 
            fill="url(#incomeGradient)" 
            name="Income" 
            radius={[6, 6, 0, 0]} 
            maxBarSize={50}
          />
          <Bar 
            dataKey="expense" 
            fill="url(#expenseGradient)" 
            name="Expense" 
            radius={[6, 6, 0, 0]} 
            maxBarSize={50}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
