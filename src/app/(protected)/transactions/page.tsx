"use client";

import { useState } from "react";
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
import { TransactionDetailDialog } from "@/components/transactions/TransactionDetailDialog";
import { EditTransactionDialog } from "@/components/transactions/EditTransactionDialog";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"] & {
  transaction_lines?: {
    account?: {
      currency: string | null;
      type: string;
    } | null;
  }[];
};

export default function TransactionsPage() {
  const { transactions, loading, error, deleteTransaction, getTransaction, refreshTransactions } = useTransactions();
  const { format: formatCurrency } = useCurrency();
  const [activeTab, setActiveTab] = useState("list");
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

  const handleSuccess = () => {
    setActiveTab("list");
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
    // The EditTransactionDialog now handles the save internally
    // This callback is just for refreshing the transaction list
    // We'll fetch transactions again through the hook's refresh
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
      <div className="min-h-screen p-8 flex items-center justify-center">
         <Card className="border-destructive/20 p-6">
            <p className="text-destructive">
                {error}
            </p>
         </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 animate-in fade-in duration-500">
      <div className="max-w-[98%] mx-auto space-y-8">
        <div className="flex items-end justify-between">
            <div>
            <h1 className="text-3xl font-bold text-foreground">
                Transactions
            </h1>
            <p className="text-muted-foreground mt-2">
                Manage your financial records
            </p>
            </div>
            
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList>
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

          <TabsContent value="list">
            <Card className="overflow-hidden">
              {transactions.length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center">
                  <h3 className="text-lg font-medium text-foreground mb-2">No transactions yet</h3>
                  <p className="text-muted-foreground mb-6 max-w-sm">
                    Start tracking your finances by creating your first transaction record.
                  </p>
                  <div className="flex gap-3">
                    <Button onClick={() => setActiveTab("income")}>
                      Add Income
                    </Button>
                    <Button onClick={() => setActiveTab("expense")} variant="secondary">
                       Add Expense
                    </Button>
                  </div>
                </div>
              ) : (
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
                          {transaction.description}
                        </TableCell>
                        <TableCell className={`font-semibold ${transaction.type === 'income' ? 'text-primary' : 'text-foreground'}`}>
                          {transaction.type === 'expense' ? '-' : ''}{formatCurrency(transaction.amount, { 
                            currency: (transaction.currency && transaction.currency !== "USD") 
                              ? transaction.currency 
                              : (transaction.transaction_lines?.find((l: any) => 
                                  l.account?.type === 'asset' || l.account?.type === 'liability' || l.account?.type === 'credit_card'
                                )?.account?.currency || transaction.currency || "USD")
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
              )}
            </Card>
          </TabsContent>

          <TabsContent value="income" className="mt-6">
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

          <TabsContent value="expense" className="mt-6">
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

          <TabsContent value="transfer" className="mt-6">
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
      </div>
    </div>
  );
}
