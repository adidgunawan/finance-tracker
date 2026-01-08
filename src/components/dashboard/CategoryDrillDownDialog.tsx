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
import { 
  getTransactionsByCategory, 
  getTransactionsByAccountId,
  getChildAccountSubtotals,
  type DrillDownTransaction,
  type DrillDownSubtotal 
} from "@/actions/dashboard-drilldown";
import { getTransaction } from "@/actions/transactions";
import { useCurrency } from "@/hooks/useCurrency";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { TransactionDetailDialog } from "@/components/transactions/TransactionDetailDialog";
import { Button } from "@/components/ui/button";
import { ChevronRight, ArrowLeft } from "lucide-react";
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

type ViewMode = "subtotals" | "transactions";

interface BreadcrumbItem {
  name: string;
  accountId?: string;
}

export function CategoryDrillDownDialog({
  open,
  onOpenChange,
  categoryName,
}: CategoryDrillDownDialogProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("subtotals");
  const [subtotals, setSubtotals] = useState<DrillDownSubtotal[]>([]);
  const [transactions, setTransactions] = useState<DrillDownTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [loadingTransaction, setLoadingTransaction] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const { format: formatCurrency } = useCurrency();

  // Reset state when dialog opens with a new category
  useEffect(() => {
    if (open && categoryName) {
      setViewMode("subtotals");
      setBreadcrumbs([{ name: categoryName }]);
      setLoading(true);
      
      // Try to fetch child account subtotals first
      getChildAccountSubtotals(categoryName)
        .then((data) => {
          if (data && data.length > 0) {
            // Has children, show subtotals
            setSubtotals(data);
            setViewMode("subtotals");
          } else {
            // No children, show transactions directly
            return getTransactionsByCategory(categoryName).then((txns) => {
              setTransactions(txns);
              setViewMode("transactions");
            });
          }
        })
        .catch((err) => {
          console.error("Failed to fetch drilldown data", err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [open, categoryName]);

  const handleSubtotalClick = async (subtotal: DrillDownSubtotal) => {
    if (subtotal.hasChildren) {
      // Drill down to show child subtotals
      setLoading(true);
      setBreadcrumbs([...breadcrumbs, { name: subtotal.accountName, accountId: subtotal.accountId }]);
      
      try {
        const childSubtotals = await getChildAccountSubtotals(subtotal.accountName);
        if (childSubtotals && childSubtotals.length > 0) {
          setSubtotals(childSubtotals);
          setViewMode("subtotals");
        } else {
          // No children, show transactions
          const txns = await getTransactionsByAccountId(subtotal.accountId);
          setTransactions(txns);
          setViewMode("transactions");
        }
      } catch (err) {
        console.error("Failed to fetch child data", err);
      } finally {
        setLoading(false);
      }
    } else {
      // No children, show transactions
      setLoading(true);
      setBreadcrumbs([...breadcrumbs, { name: subtotal.accountName, accountId: subtotal.accountId }]);
      
      try {
        const txns = await getTransactionsByAccountId(subtotal.accountId);
        setTransactions(txns);
        setViewMode("transactions");
      } catch (err) {
        console.error("Failed to fetch transactions", err);
      } finally {
        setLoading(false);
      }
    }
  };

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

  const handleBreadcrumbClick = async (index: number) => {
    if (index === breadcrumbs.length - 1) return; // Already at this level

    const targetBreadcrumb = breadcrumbs[index];
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newBreadcrumbs);
    setLoading(true);

    try {
      if (index === 0) {
        // Back to root - show subtotals or transactions
        const childSubtotals = await getChildAccountSubtotals(targetBreadcrumb.name);
        if (childSubtotals && childSubtotals.length > 0) {
          setSubtotals(childSubtotals);
          setViewMode("subtotals");
        } else {
          const txns = await getTransactionsByCategory(targetBreadcrumb.name);
          setTransactions(txns);
          setViewMode("transactions");
        }
      } else {
        // Navigate to intermediate level
        const childSubtotals = await getChildAccountSubtotals(targetBreadcrumb.name);
        if (childSubtotals && childSubtotals.length > 0) {
          setSubtotals(childSubtotals);
          setViewMode("subtotals");
        } else {
          const txns = await getTransactionsByCategory(targetBreadcrumb.name);
          setTransactions(txns);
          setViewMode("transactions");
        }
      }
    } catch (err) {
      console.error("Failed to navigate breadcrumb", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (breadcrumbs.length > 1) {
      handleBreadcrumbClick(breadcrumbs.length - 2);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-2">
              {breadcrumbs.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="h-8 w-8 p-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <div className="flex-1">
                <DialogTitle>
                  {breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].name : categoryName || "Category"} Details
                </DialogTitle>
                <DialogDescription>
                  {viewMode === "subtotals" 
                    ? "Click on a category to drill down" 
                    : "Transactions for this category in the current month"}
                </DialogDescription>
              </div>
            </div>
            
            {/* Breadcrumb Navigation */}
            {breadcrumbs.length > 1 && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground pt-2">
                {breadcrumbs.map((crumb, index) => (
                  <div key={index} className="flex items-center gap-1">
                    <button
                      onClick={() => handleBreadcrumbClick(index)}
                      className={`hover:text-foreground transition-colors ${
                        index === breadcrumbs.length - 1 ? "font-medium text-foreground" : ""
                      }`}
                    >
                      {crumb.name}
                    </button>
                    {index < breadcrumbs.length - 1 && (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-hidden min-h-0 relative">
            <ScrollArea className="h-full max-h-[500px] w-full border rounded-md">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                  <TableRow>
                    {viewMode === "subtotals" ? (
                      <>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right w-[80px]">%</TableHead>
                      </>
                    ) : (
                      <>
                        <TableHead className="w-[100px]">Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    // Loading Skeletons
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                        {viewMode === "subtotals" && (
                          <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : viewMode === "subtotals" ? (
                    // Subtotals View
                    subtotals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                          No sub-categories found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      subtotals.map((subtotal) => (
                        <TableRow 
                          key={subtotal.accountId}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleSubtotalClick(subtotal)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {subtotal.accountName}
                              {subtotal.hasChildren && (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(subtotal.amount, { currency: subtotal.currency })}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {subtotal.percentage.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))
                    )
                  ) : (
                    // Transactions View
                    transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                          No transactions found for this period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((t) => (
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
                    )
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
