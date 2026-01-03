"use client";

import { useState, useEffect } from "react";

import { Card } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { useCurrency } from "@/hooks/useCurrency";

interface AssetDistributionChartProps {
  data: {
    name: string;
    value: number;
  }[];
}

const COLORS = [
  "#3b82f6", // blue-500
  "#22c55e", // green-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
];

export function AssetDistributionChart({ data }: AssetDistributionChartProps) {
  const { format: formatCurrency } = useCurrency();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (data.length === 0) {
    return (
      <Card className="p-4 md:p-6 flex flex-col items-center justify-center min-h-[350px]">
        <h3 className="text-lg font-bold text-foreground mb-4 w-full text-left bg-muted p-2 rounded-lg">
          Asset Distribution
        </h3>
        <div className="flex flex-col items-center justify-center text-muted-foreground">
            <p className="font-medium">No asset data available</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 md:p-6">
      <h3 className="text-lg font-bold text-foreground mb-4 md:mb-6">
        Asset Distribution
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={isMobile ? 50 : 60}
            outerRadius={isMobile ? 80 : 100}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[index % COLORS.length]} 
                className="hover:opacity-80 transition-opacity duration-300 cursor-pointer"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.8)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.5)",
              borderRadius: "12px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              padding: "12px"
            }}
            formatter={(value: number) => [formatCurrency(value), 'Value']}
            itemStyle={{ color: '#18181b', fontWeight: 500 }}
          />
          <Legend
            verticalAlign={isMobile ? "bottom" : "middle"}
            align={isMobile ? "center" : "right"}
            layout={isMobile ? "horizontal" : "vertical"}
            iconType="circle"
            formatter={(value) => <span className="text-sm font-medium text-muted-foreground ml-2">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}
