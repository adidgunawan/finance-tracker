"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Paperclip } from "lucide-react";
import { TransactionDetailDialog } from "@/components/transactions/TransactionDetailDialog";
import { EditTransactionDialog } from "@/components/transactions/EditTransactionDialog";
import { TransactionCard } from "@/components/transactions/TransactionCard";

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
  const { transactions, loading, error, deleteTransaction, getTransaction, refreshTransactions } = useTransactions();
  const { format: formatCurrency } = useCurrency();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("list");
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  
  // Mobile creation state
  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<TransactionType>("income");

  // Handle URL parameters for Quick Add
  useEffect(() => {
    const addParam = searchParams.get('add');
    if (addParam && ['income', 'expense', 'transfer'].includes(addParam)) {
      setCreateType(addParam as TransactionType);
      setCreateOpen(true);
    }
  }, [searchParams]);

  const handleSuccess = () => {
    setActiveTab("list");
    setCreateOpen(false);
    refreshTransactions();
  };

  const handleViewDetail = async (id: string) => {
    try {
      const transaction = await getTransaction(id);
      setSelectedTransaction(transaction);
      setDetailOpen(true);
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


  if (loading) {
    return (
        <div className="flex h-screen items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
         <Card className="border-destructive/20 p-6">
            <p className="text-destructive">
                {error}
            </p>
         </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 animate-in fade-in duration-500 pb-24 md:pb-8 overflow-x-hidden">
      <div className="max-w-[98%] mx-auto space-y-6 md:space-y-8">
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="hidden md:inline-flex">
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

          <TabsContent value="list" className="m-0">
            {transactions.length === 0 ? (
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
                {/* Mobile placeholder button */}
                <div className="md:hidden">
                   <p className="text-sm text-muted-foreground">Tap the + button to add one.</p>
                </div>
              </Card>
            ) : (
                <>
                  {/* Desktop Table View */}
                  <Card className="hidden md:block overflow-hidden">
                    <Table>
                      <TableHeader>
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
                              <div className="flex items-center gap-2">
                                <span>{transaction.description}</span>
                                {transaction.transaction_attachments && transaction.transaction_attachments.length > 0 && (
                                  <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
                                )}
                              </div>
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
                  </Card>

                  {/* Mobile List View */}
                  <div className="md:hidden space-y-4">
                    {transactions.map((transaction) => (
                      <TransactionCard
                        key={transaction.id}
                        transaction={transaction}
                        onClick={() => handleViewDetail(transaction.id)}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </>
            )}
          </TabsContent>

          <TabsContent value="income" className="mt-6 hidden md:block">
            <Card className="p-8 max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-8 border-b pb-6">
                <div>
                   <h2 className="text-xl font-bold text-foreground">New Income</h2>
                   <p className="text-sm text-muted-foreground">Record money coming in</p>
                </div>
                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                    <PlusIcon className="h-6 w-6" />
                </div>
              </div>
              <IncomeForm onSuccess={handleSuccess} />
            </Card>
          </TabsContent>

          <TabsContent value="expense" className="mt-6 hidden md:block">
            <Card className="p-8 max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-8 border-b pb-6">
                <div>
                   <h2 className="text-xl font-bold text-foreground">New Expense</h2>
                   <p className="text-sm text-muted-foreground">Record money going out</p>
                </div>
                <div className="h-10 w-10 bg-destructive/10 rounded-full flex items-center justify-center text-destructive">
                    <ArrowTopRightIcon className="h-6 w-6" />
                </div>
              </div>
              <ExpenseForm onSuccess={handleSuccess} />
            </Card>
          </TabsContent>

          <TabsContent value="transfer" className="mt-6 hidden md:block">
            <Card className="p-8 max-w-5xl mx-auto">
               <div className="flex items-center justify-between mb-8 border-b pb-6">
                <div>
                   <h2 className="text-xl font-bold text-foreground">New Transfer</h2>
                   <p className="text-sm text-muted-foreground">Move money between accounts</p>
                </div>
                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                    <UpdateIcon className="h-6 w-6" />
                </div>
              </div>
              <TransferForm onSuccess={handleSuccess} />
            </Card>
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
          <SheetContent side="bottom" className="h-[95vh] p-0 rounded-t-xl z-[200] flex flex-col">
             <SheetHeader className="p-4 border-b shrink-0">
                <SheetTitle>
                    {createType === "income" && "New Income"}
                    {createType === "expense" && "New Expense"}
                    {createType === "transfer" && "New Transfer"}
                </SheetTitle>
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
