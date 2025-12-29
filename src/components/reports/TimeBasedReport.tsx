"use client";

import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCurrency } from "@/hooks/useCurrency";
import type { TimeBasedReportItem } from "@/actions/reports";

interface TimeBasedReportProps {
  data: TimeBasedReportItem[];
  period: "week" | "month" | "year";
}

export function TimeBasedReport({ data, period }: TimeBasedReportProps) {
  const { format: formatCurrency } = useCurrency();

  if (data.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          No data available for the selected period.
        </div>
      </Card>
    );
  }

  const totals = data.reduce(
    (acc, item) => ({
      income: acc.income + item.income,
      expense: acc.expense + item.expense,
      net: acc.net + item.net,
    }),
    { income: 0, expense: 0, net: 0 }
  );

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">
        {period.charAt(0).toUpperCase() + period.slice(1)}ly Report
      </h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Period</TableHead>
            <TableHead className="text-right">Income</TableHead>
            <TableHead className="text-right">Expense</TableHead>
            <TableHead className="text-right">Net</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{item.period}</TableCell>
              <TableCell className="text-right text-primary">
                {formatCurrency(item.income)}
              </TableCell>
              <TableCell className="text-right text-destructive">
                {formatCurrency(item.expense)}
              </TableCell>
              <TableCell
                className={`text-right font-semibold ${
                  item.net >= 0 ? "text-primary" : "text-destructive"
                }`}
              >
                {formatCurrency(Math.abs(item.net))}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="font-bold">
            <TableCell>Total</TableCell>
            <TableCell className="text-right text-primary">
              {formatCurrency(totals.income)}
            </TableCell>
            <TableCell className="text-right text-destructive">
              {formatCurrency(totals.expense)}
            </TableCell>
            <TableCell
              className={`text-right ${
                totals.net >= 0 ? "text-primary" : "text-destructive"
              }`}
            >
              {formatCurrency(Math.abs(totals.net))}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Card>
  );
}

