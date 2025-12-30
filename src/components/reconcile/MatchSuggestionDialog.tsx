"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { CheckIcon } from "@radix-ui/react-icons";
import type { ParsedCSVTransaction } from "@/lib/utils/csv-parser";
import { getTransactions } from "@/actions/transactions";
import { findMatchingTransactions } from "@/lib/utils/transaction-matcher";
import { useCurrency } from "@/hooks/useCurrency";
import { useAccounts } from "@/hooks/useAccounts";
import { TransactionDetailDialog } from "@/components/transactions/TransactionDetailDialog";

interface MatchSuggestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  csvTransaction: ParsedCSVTransaction;
  sessionId: string;
  csvRowIndex: number;
  accountId: string;
  onMatch: (transactionId: string) => Promise<void>;
}

export function MatchSuggestionDialog({
  open,
  onOpenChange,
  csvTransaction,
  onMatch,
  accountId,
}: MatchSuggestionDialogProps) {
  const { format: formatCurrency } = useCurrency();
  const { accounts } = useAccounts();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [matching, setMatching] = useState(false);

  useEffect(() => {
    if (open) {
      loadTransactions();
    }
  }, [open, accountId]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const allTransactions = await getTransactions();
      
      // Filter transactions that involve this account
      // For now, we'll get all transactions and let the matcher filter
      setTransactions(allTransactions);
    } catch (error) {
      console.error("Failed to load transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = findMatchingTransactions(csvTransaction, transactions);

  const handleMatch = async (transactionId: string) => {
    try {
      setMatching(true);
      await onMatch(transactionId);
    } catch (error) {
      console.error("Failed to match:", error);
    } finally {
      setMatching(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Find Matching Transaction</DialogTitle>
            <DialogDescription>
              Select a transaction to match with this CSV entry
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">CSV Transaction:</p>
              <div className="text-sm space-y-1">
                <p>Date: {format(new Date(csvTransaction.date), "MMM d, yyyy")}</p>
                <p>Description: {csvTransaction.description}</p>
                <p>Amount: {formatCurrency(csvTransaction.amount)} ({csvTransaction.type})</p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : suggestions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No matching transactions found</p>
                <p className="text-sm mt-2">Try adjusting the date or amount, or create a new transaction</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Found {suggestions.length} matching transaction{suggestions.length !== 1 ? "s" : ""}
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suggestions.map((suggestion) => (
                      <TableRow key={suggestion.transactionId}>
                        <TableCell>
                          {format(new Date(suggestion.transaction.transaction_date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>{suggestion.transaction.description}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(suggestion.transaction.amount)}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs px-2 py-1 rounded bg-muted">
                            {suggestion.transaction.type}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedTransaction(suggestion.transaction);
                                setShowDetail(true);
                              }}
                            >
                              View
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleMatch(suggestion.transactionId)}
                              disabled={matching}
                            >
                              <CheckIcon className="h-4 w-4 mr-1" />
                              Match
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {showDetail && selectedTransaction && (
        <TransactionDetailDialog
          open={showDetail}
          onOpenChange={setShowDetail}
          transaction={selectedTransaction}
        />
      )}
    </>
  );
}

