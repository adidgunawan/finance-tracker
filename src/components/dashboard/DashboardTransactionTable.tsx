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
import { Button } from "@/components/ui/button";
import { ArrowTopRightIcon, ArrowBottomLeftIcon, UpdateIcon } from "@radix-ui/react-icons";
import { useCurrency } from "@/hooks/useCurrency";
import { format } from "date-fns";
import type { Database } from "@/lib/supabase/types";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];

interface DashboardTransactionTableProps {
  transactions: Transaction[];
}

export function DashboardTransactionTable({ transactions }: DashboardTransactionTableProps) {
  const { format: formatCurrency } = useCurrency();

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="p-4 md:p-6 flex items-center justify-between border-b">
        <h3 className="text-lg font-bold text-foreground">
          Recent Transactions
        </h3>
        <Button variant="outline" size="sm" asChild>
          <Link href="/transactions">
            View All
          </Link>
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="hidden md:table-cell">Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No recent transactions
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((t) => (
                <TableRow key={t.id} className="group hover:bg-muted/50 transition-colors">
                  <TableCell>
                    <div className={`
                      flex items-center justify-center w-8 h-8 rounded-full
                      ${t.type === 'income' ? 'bg-green-100 text-green-600' : 
                        t.type === 'expense' ? 'bg-red-100 text-red-600' : 
                        'bg-blue-100 text-blue-600'}
                    `}>
                      {t.type === 'income' && <ArrowBottomLeftIcon className="w-4 h-4" />}
                      {t.type === 'expense' && <ArrowTopRightIcon className="w-4 h-4" />}
                      {t.type === 'transfer' && <UpdateIcon className="w-4 h-4" />}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{t.description}</span>
                      <span className="md:hidden text-xs text-muted-foreground">
                        {format(new Date(t.transaction_date), "MMM d")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {format(new Date(t.transaction_date), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    <span className={
                      t.type === 'income' ? 'text-green-600' : 
                      t.type === 'expense' ? 'text-foreground' : 'text-blue-600'
                    }>
                      {t.type === 'expense' ? '-' : '+'}
                      {formatCurrency(t.amount, { currency: t.currency || undefined })}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
