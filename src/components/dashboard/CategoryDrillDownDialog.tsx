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
import { useCurrency } from "@/hooks/useCurrency";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

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

  return (
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
                    <TableRow key={t.id}>
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
  );
}
