"use client";

import { Card } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useCurrency } from "@/hooks/useCurrency";
import { format, parseISO } from "date-fns";

interface DailyTrendChartProps {
  data: {
    date: string; // YYYY-MM-DD
    income: number;
    expense: number;
  }[];
}

export function DailyTrendChart({ data }: DailyTrendChartProps) {
  const { format: formatCurrency, symbol } = useCurrency();

  return (
    <Card className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-foreground">
          Daily Transaction Flow
        </h3>
      </div>
      
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
            <XAxis
              dataKey="date"
              tickFormatter={(dateStr) => format(parseISO(dateStr), "d MMM")}
              tick={{ fill: "#71717a", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              minTickGap={30}
            />
            <YAxis
              tickFormatter={(value) => `${symbol}${value}`}
              tick={{ fill: "#71717a", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={60}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                backdropFilter: "blur(8px)",
                borderRadius: "8px",
                border: "1px solid #e4e4e7",
                fontSize: "12px",
              }}
              labelFormatter={(label) => format(parseISO(label), "EEEE, d MMM yyyy")}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Legend verticalAlign="top" height={36} iconType="circle" />
            <Area
              type="monotone"
              dataKey="income"
              name="Income"
              stroke="#22c55e"
              fillOpacity={1}
              fill="url(#colorIncome)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="expense"
              name="Expense"
              stroke="#ef4444"
              fillOpacity={1}
              fill="url(#colorExpense)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
