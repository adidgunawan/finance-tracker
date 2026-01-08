"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getTransactionsByCategory, type DrillDownTransaction } from "@/actions/dashboard-drilldown";
import { getTransaction } from "@/actions/transactions";
import { useCurrency } from "@/hooks/useCurrency";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { TransactionDetailDialog } from "@/components/transactions/TransactionDetailDialog";
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

interface CategoryDrillDownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryName: string | null;
}

export function CategoryDrillDownDialog({
  open,
  onOpenChange,
  categoryName,
}: CategoryDrillDownDialogProps) {
  const [data, setData] = useState<DrillDownTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [loadingTransaction, setLoadingTransaction] = useState(false);
  const { format: formatCurrency } = useCurrency();

  useEffect(() => {
    if (open && categoryName) {
      setLoading(true);
      getTransactionsByCategory(categoryName)
        .then((transactions) => {
          setData(transactions);
        })
        .catch((err) => {
          console.error("Failed to fetch drilldown data", err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [open, categoryName]);

  const handleTransactionClick = async (transactionId: string) => {
    setLoadingTransaction(true);
    try {
      const transaction = await getTransaction(transactionId);
      setSelectedTransaction(transaction);
      setDetailDialogOpen(true);
    } catch (error) {
      console.error("Failed to fetch transaction details:", error);
    } finally {
      setLoadingTransaction(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{categoryName} Details</DialogTitle>
            <DialogDescription>
              Transactions for this category in the current month
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden min-h-0 relative">
            <ScrollArea className="h-full max-h-[500px] w-full border rounded-md">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-[100px]">Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    // Loading Skeletons
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                        No transactions found for this period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map((t) => (
                      <TableRow 
                        key={t.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleTransactionClick(t.id)}
                      >
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {format(new Date(t.date), "MMM d")}
                        </TableCell>
                        <TableCell className="font-medium">
                          {t.description || "No description"}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(t.amount, { currency: t.currency })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transaction Detail Dialog */}
      <TransactionDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        transaction={selectedTransaction}
      />
    </>
  );
}
