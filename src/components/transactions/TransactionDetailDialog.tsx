"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/hooks/useCurrency";
import { format } from "date-fns";
import type { Database } from "@/lib/supabase/types";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"] & {
  transaction_lines?: Array<{
    id: string;
    account_id: string;
    debit_amount: number | null;
    credit_amount: number | null;
    account?: { id: string; name: string; type: string };
  }>;
  transaction_line_items?: Array<{
    id: string;
    description: string;
    amount: number;
    expense_account_id?: string | null;
    income_account_id?: string | null;
    expense_account?: { id: string; name: string } | null;
    income_account?: { id: string; name: string } | null;
  }>;
};

interface TransactionDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
}

export function TransactionDetailDialog({
  open,
  onOpenChange,
  transaction,
}: TransactionDetailDialogProps) {
  const { format: formatCurrency } = useCurrency();

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Date</div>
                <div className="font-medium">
                  {format(new Date(transaction.transaction_date), "MMM dd, yyyy")}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Type</div>
                <Badge
                  variant={
                    transaction.type === "income"
                      ? "default"
                      : transaction.type === "expense"
                      ? "destructive"
                      : "outline"
                  }
                >
                  {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                </Badge>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Description</div>
                <div className="font-medium">{transaction.description}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Amount</div>
                <div className="font-bold text-lg">
                  {formatCurrency(transaction.amount)}
                </div>
              </div>
              {transaction.payee_payer && (
                <div>
                  <div className="text-sm text-muted-foreground">
                    {transaction.type === "income" ? "Payee" : "Payer"}
                  </div>
                  <div className="font-medium">{transaction.payee_payer}</div>
                </div>
              )}
              {transaction.transaction_id && (
                <div>
                  <div className="text-sm text-muted-foreground">Reference</div>
                  <div className="font-mono text-sm">{transaction.transaction_id}</div>
                </div>
              )}
            </div>
          </Card>

          {/* Line Items (if exists) */}
          {transaction.transaction_line_items &&
            transaction.transaction_line_items.length > 0 && (
              <Card className="p-4">
                <h3 className="font-semibold mb-4">Line Items</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transaction.transaction_line_items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>
                          {item.expense_account?.name || item.income_account?.name || "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}

          {/* Transaction Lines (Double-Entry) */}
          {transaction.transaction_lines && transaction.transaction_lines.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Accounting Entries</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transaction.transaction_lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>
                        {line.account?.name || "Unknown Account"}
                      </TableCell>
                      <TableCell className="text-right">
                        {line.debit_amount
                          ? formatCurrency(line.debit_amount)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {line.credit_amount
                          ? formatCurrency(line.credit_amount)
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

