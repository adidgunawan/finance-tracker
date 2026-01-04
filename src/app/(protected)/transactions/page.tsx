"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import type { Database } from "@/lib/supabase/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { IncomeForm } from "@/components/transactions/IncomeForm";
import { ExpenseForm } from "@/components/transactions/ExpenseForm";
import { TransferForm } from "@/components/transactions/TransferForm";
import { useTransactions } from "@/hooks/useTransactions";
import { useCurrency } from "@/hooks/useCurrency";
import { toast } from "sonner";
import { format } from "date-fns";
import { TrashIcon, PlusIcon, ArrowTopRightIcon, ArrowBottomLeftIcon, UpdateIcon } from "@radix-ui/react-icons";
import { TransactionDetailDialog } from "@/components/transactions/TransactionDetailDialog";
import { EditTransactionDialog } from "@/components/transactions/EditTransactionDialog";
import { TransactionCard } from "@/components/transactions/TransactionCard";

import { PaginationControls } from "@/components/ui/pagination-controls";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"] & {
  transaction_lines?: {
    account?: {
      currency: string | null;
      type: string;
    } | null;
  }[];
  transaction_attachments?: any[];
};

type TransactionType = "income" | "expense" | "transfer";

function TransactionsContent() {
  const { 
    transactions, 
    loading, 
    error, 
    deleteTransaction, 
    getTransaction, 
    refreshTransactions,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalCount,
    totalPages
  } = useTransactions();
  const { format: formatCurrency } = useCurrency();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("list");
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  
  // Mobile creation state
  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<TransactionType>("income");
  
  // Mobile infinite scroll state
  const [mobileTransactions, setMobileTransactions] = useState<Transaction[]>([]);
  const [mobileLoading, setMobileLoading] = useState(false);
  const hasMore = page < totalPages;
  const lastLoadedPageRef = useRef(0);

  // Handle URL parameters for Quick Add
  useEffect(() => {
    const addParam = searchParams.get('add');
    if (addParam && ['income', 'expense', 'transfer'].includes(addParam)) {
      setCreateType(addParam as TransactionType);
      setCreateOpen(true);
    }
  }, [searchParams]);

  // Update mobile transactions when page changes
  useEffect(() => {
    if (transactions.length > 0 && page !== lastLoadedPageRef.current) {
      lastLoadedPageRef.current = page;
      
      if (page === 1) {
        setMobileTransactions(transactions);
      } else {
        setMobileTransactions(prev => [...prev, ...transactions]);
      }
    }
  }, [page, transactions.length]);

  // Handle loading more transactions for mobile
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      setPage(page + 1);
    }
  };

  // Infinite scroll hook for mobile
  const { loadMoreRef } = useInfiniteScroll({
    onLoadMore: handleLoadMore,
    hasMore,
    loading,
    threshold: 200,
  });

  const handleSuccess = () => {
    setActiveTab("list");
    setCreateOpen(false);
    refreshTransactions();
  };

  const handleViewDetail = async (id: string) => {
    // Find the transaction from the current list for instant display
    const transaction = transactions.find(t => t.id === id);
    
    // Open dialog immediately with existing data (if available)
    setSelectedTransaction(transaction || null);
    setDetailOpen(true);
    
    // Fetch full transaction details in the background
    try {
      const fullTransaction = await getTransaction(id);
      setSelectedTransaction(fullTransaction);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load transaction details");
    }
  };

  const handleEdit = (transaction: any) => {
    setSelectedTransaction(transaction);
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    refreshTransactions();
  };

  const handleDelete = async (id: string) => {
    toast("Are you sure you want to delete this transaction?", {
      description: "This action cannot be undone.",
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            await deleteTransaction(id);
            toast.success("Transaction deleted successfully");
            if (selectedTransaction?.id === id) {
              setSelectedTransaction(null);
            }
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to delete transaction");
          }
        },
      },
      cancel: {
        label: "Cancel",
        onClick: () => {},
      },
    });
  };




  return (
    <div className="container mx-auto px-4 md:px-8 py-4 md:py-6 pb-24 md:pb-8">
      <div className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Transactions
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
              Manage your financial records
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex-none hidden md:inline-flex w-fit">
            <TabsTrigger value="list">
              All Transactions
            </TabsTrigger>
            <TabsTrigger value="income">
              <PlusIcon className="mr-2 h-4 w-4" /> New Income
            </TabsTrigger>
            <TabsTrigger value="expense">
              <ArrowTopRightIcon className="mr-2 h-4 w-4" /> New Expense
            </TabsTrigger>
            <TabsTrigger value="transfer">
              <UpdateIcon className="mr-2 h-4 w-4" /> New Transfer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4 mt-0">
            {error ? (
              <Card className="border-destructive/20 p-6">
                <p className="text-destructive text-center">{error}</p>
              </Card>
            ) : loading ? (
              <Card className="p-8 text-center">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              </Card>
            ) : transactions.length === 0 ? (
              <Card className="p-8 md:p-16 text-center flex flex-col items-center">
                <h3 className="text-lg font-medium text-foreground mb-2">No transactions yet</h3>
                <p className="text-muted-foreground mb-6 max-w-sm">
                  Start tracking your finances by creating your first transaction record.
                </p>
                <div className="flex gap-3 hidden md:flex">
                  <Button onClick={() => setActiveTab("income")}>
                    Add Income
                  </Button>
                  <Button onClick={() => setActiveTab("expense")} variant="secondary">
                    Add Expense
                  </Button>
                </div>
                <div className="md:hidden">
                  <p className="text-sm text-muted-foreground">Tap the + button to add one.</p>
                </div>
              </Card>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                        <TableRow>
                          <TableHead className="font-semibold pl-6">Date</TableHead>
                          <TableHead className="font-semibold">Type</TableHead>
                          <TableHead className="font-semibold">Description</TableHead>
                          <TableHead className="font-semibold">Amount</TableHead>
                          <TableHead className="font-semibold">Party</TableHead>
                          <TableHead className="font-semibold">Ref</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((transaction) => (
                          <TableRow
                            key={transaction.id}
                            className="group cursor-pointer hover:bg-accent/50"
                            onClick={() => handleViewDetail(transaction.id)}
                          >
                            <TableCell className="text-muted-foreground pl-6 font-medium">
                              {format(new Date(transaction.transaction_date), "MMM dd, yyyy")}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`
                                  inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold
                                  ${
                                    transaction.type === "income"
                                      ? "bg-primary/10 text-primary border border-primary/20"
                                      : transaction.type === "expense"
                                      ? "bg-destructive/10 text-destructive border border-destructive/20"
                                      : "bg-primary/10 text-primary border border-primary/20"
                                  }
                                `}
                              >
                                {transaction.type === "income" && <ArrowBottomLeftIcon className="mr-1 h-3 w-3" />}
                                {transaction.type === "expense" && <ArrowTopRightIcon className="mr-1 h-3 w-3" />}
                                {transaction.type === "transfer" && <UpdateIcon className="mr-1 h-3 w-3" />}
                                {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                              </span>
                            </TableCell>
                            <TableCell className="text-foreground font-medium">
                              {transaction.description}
                            </TableCell>
                            <TableCell className={`font-semibold ${transaction.type === 'income' ? 'text-primary' : 'text-foreground'}`}>
                              {transaction.type === 'expense' ? '-' : ''}{formatCurrency(transaction.amount, { 
                                currency: transaction.currency || "USD"
                              })}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {transaction.payee_payer || "-"}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs font-mono">
                              {transaction.transaction_id || ""}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(transaction);
                                  }}
                                  className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <UpdateIcon className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(transaction.id);
                                  }}
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Mobile List View with Infinite Scroll */}
                <div className="md:hidden">
                  <div className="border rounded-lg overflow-hidden">
                    {mobileTransactions.map((transaction) => (
                      <TransactionCard
                        key={transaction.id}
                        transaction={transaction}
                        onClick={() => handleViewDetail(transaction.id)}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                  
                  {/* Infinite scroll trigger */}
                  {hasMore && (
                    <div 
                      ref={loadMoreRef}
                      className="py-8 text-center"
                    >
                      <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        Loading more...
                      </div>
                    </div>
                  )}
                  
                  {!hasMore && mobileTransactions.length > 0 && (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      No more transactions
                    </div>
                  )}
                </div>

                {/* Pagination - Desktop Only */}
                <div className="hidden md:block">
                  <PaginationControls
                    currentPage={page}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    totalCount={totalCount}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                  />
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="income" className="hidden md:block space-y-6 mt-0">
            <div className="flex items-center justify-between pb-4 border-b">
              <div>
                <h2 className="text-2xl font-bold text-foreground">New Income</h2>
                <p className="text-sm text-muted-foreground mt-1">Record money coming in</p>
              </div>
              <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                <PlusIcon className="h-6 w-6" />
              </div>
            </div>
            <div>
              <IncomeForm onSuccess={handleSuccess} />
            </div>
          </TabsContent>

          <TabsContent value="expense" className="hidden md:block space-y-6 mt-0">
            <div className="flex items-center justify-between pb-4 border-b">
              <div>
                <h2 className="text-2xl font-bold text-foreground">New Expense</h2>
                <p className="text-sm text-muted-foreground mt-1">Record money going out</p>
              </div>
              <div className="h-12 w-12 bg-destructive/10 rounded-full flex items-center justify-center text-destructive">
                <ArrowTopRightIcon className="h-6 w-6" />
              </div>
            </div>
            <div>
              <ExpenseForm onSuccess={handleSuccess} />
            </div>
          </TabsContent>

          <TabsContent value="transfer" className="hidden md:block space-y-6 mt-0">
            <div className="flex items-center justify-between pb-4 border-b">
              <div>
                <h2 className="text-2xl font-bold text-foreground">New Transfer</h2>
                <p className="text-sm text-muted-foreground mt-1">Move money between accounts</p>
              </div>
              <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                <UpdateIcon className="h-6 w-6" />
              </div>
            </div>
            <div>
              <TransferForm onSuccess={handleSuccess} />
            </div>
          </TabsContent>
        </Tabs>

        <TransactionDetailDialog
          open={detailOpen}
          onOpenChange={setDetailOpen}
          transaction={selectedTransaction}
        />

        <EditTransactionDialog
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) {
              setSelectedTransaction(null);
              refreshTransactions();
            }
          }}
          transaction={selectedTransaction}
          onSave={handleSaveEdit}
        />

        {/* Mobile Creation Sheet */}
        <Sheet open={createOpen} onOpenChange={setCreateOpen}>
          <SheetContent side="bottom" className="h-screen p-0 z-[200] flex flex-col">
            <SheetHeader className="p-4 border-b shrink-0 space-y-3">
              <SheetTitle className="text-center">New Transaction</SheetTitle>
              
              {/* Transaction Type Selector */}
              <div className="flex gap-2 bg-muted/50 p-1 rounded-lg">
                <button
                  onClick={() => setCreateType("income")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-all ${
                    createType === "income"
                      ? "bg-background text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ArrowBottomLeftIcon className="h-4 w-4" />
                  Income
                </button>
                <button
                  onClick={() => setCreateType("expense")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-all ${
                    createType === "expense"
                      ? "bg-background text-destructive shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ArrowTopRightIcon className="h-4 w-4" />
                  Expense
                </button>
                <button
                  onClick={() => setCreateType("transfer")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-all ${
                    createType === "transfer"
                      ? "bg-background text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <UpdateIcon className="h-4 w-4" />
                  Transfer
                </button>
              </div>
            </SheetHeader>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {createType === "income" && <IncomeForm onSuccess={handleSuccess} hideSubmitButton />}
              {createType === "expense" && <ExpenseForm onSuccess={handleSuccess} hideSubmitButton />}
              {createType === "transfer" && <TransferForm onSuccess={handleSuccess} hideSubmitButton />}
            </div>

            {/* Fixed Footer */}
            <div className="shrink-0 border-t bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold"
                form={`${createType}-form`}
              >
                {createType === "income" && "Create Income"}
                {createType === "expense" && "Create Expense"}
                {createType === "transfer" && "Create Transfer"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <TransactionsContent />
    </Suspense>
  );
}
