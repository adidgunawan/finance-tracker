"use client";

import { useState } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CheckIcon, Cross2Icon, PlusIcon, UpdateIcon } from "@radix-ui/react-icons";
import type { ParsedCSVTransaction } from "@/lib/utils/csv-parser";
import type { ReconciliationMatch } from "@/actions/reconciliation";
import { matchTransaction, unmatchTransaction } from "@/actions/reconciliation";
import { MatchSuggestionDialog } from "./MatchSuggestionDialog";
import { AddTransactionFromCSVDialog } from "./AddTransactionFromCSVDialog";
import { useCurrency } from "@/hooks/useCurrency";
import { toast } from "sonner";
import { TransactionDetailDialog } from "@/components/transactions/TransactionDetailDialog";

interface CSVTransactionRowProps {
  csvTransaction: ParsedCSVTransaction;
  match: ReconciliationMatch | null;
  sessionId: string;
  csvRowIndex: number;
  accountId: string;
  onUpdate: () => void;
}

export function CSVTransactionRow({
  csvTransaction,
  match,
  sessionId,
  csvRowIndex,
  accountId,
  onUpdate,
}: CSVTransactionRowProps) {
  const { format: formatCurrency } = useCurrency();
  const [showMatchDialog, setShowMatchDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showTransactionDetail, setShowTransactionDetail] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const isMatched = match?.transaction_id !== null;
  const matchType = match?.match_type || "none";

  const handleViewTransaction = async () => {
    if (!match?.transaction_id) return;
    try {
      const { getTransaction } = await import("@/actions/transactions");
      const transaction = await getTransaction(match.transaction_id);
      setSelectedTransaction(transaction);
      setShowTransactionDetail(true);
    } catch (error) {
      toast.error("Failed to load transaction");
    }
  };

  const handleUnmatch = async () => {
    try {
      setLoading(true);
      await unmatchTransaction(sessionId, csvRowIndex);
      toast.success("Match removed");
      onUpdate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to unmatch");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (isMatched) {
      return (
        <Badge
          variant="outline"
          className={
            matchType === "auto"
              ? "bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-200 dark:border-yellow-800"
              : "bg-green-50 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-200 dark:border-green-800"
          }
        >
          <CheckIcon className="h-3 w-3 mr-1" />
          {matchType === "auto" ? "Auto" : "Manual"}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800">
        <Cross2Icon className="h-3 w-3 mr-1" />
        Unmatched
      </Badge>
    );
  };

  return (
    <>
      <TableRow
        className={isMatched ? "bg-green-50/50 dark:bg-green-900/5" : "bg-red-50/50 dark:bg-red-900/5"}
      >
        <TableCell>{getStatusBadge()}</TableCell>
        <TableCell className="font-medium">
          {format(new Date(csvTransaction.date), "MMM d, yyyy")}
        </TableCell>
        <TableCell>
          <div className="max-w-md truncate" title={csvTransaction.description}>
            {csvTransaction.description}
          </div>
        </TableCell>
        <TableCell className="text-right font-semibold">
          {csvTransaction.type === "debit" ? "-" : "+"}
          {formatCurrency(csvTransaction.amount)}
        </TableCell>
        <TableCell>
          <Badge variant="outline">
            {csvTransaction.type === "credit" ? "Credit" : "Debit"}
          </Badge>
        </TableCell>
        <TableCell>
          {isMatched ? (
            <Button
              variant="link"
              size="sm"
              onClick={handleViewTransaction}
              className="h-auto p-0"
            >
              View Transaction
            </Button>
          ) : (
            <span className="text-muted-foreground text-sm">No match</span>
          )}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            {isMatched ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleUnmatch}
                disabled={loading}
                className="h-8 w-8"
              >
                <Cross2Icon className="h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowMatchDialog(true)}
                  disabled={loading}
                  className="h-8 w-8"
                  title="Find match"
                >
                  <UpdateIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAddDialog(true)}
                  disabled={loading}
                  className="h-8 w-8"
                  title="Add transaction"
                >
                  <PlusIcon className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </TableCell>
      </TableRow>

      {showMatchDialog && (
        <MatchSuggestionDialog
          open={showMatchDialog}
          onOpenChange={setShowMatchDialog}
          csvTransaction={csvTransaction}
          sessionId={sessionId}
          csvRowIndex={csvRowIndex}
          accountId={accountId}
          onMatch={async (transactionId) => {
            await matchTransaction(sessionId, csvRowIndex, transactionId);
            setShowMatchDialog(false);
            onUpdate();
          }}
        />
      )}

      {showAddDialog && (
        <AddTransactionFromCSVDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          csvTransaction={csvTransaction}
          sessionId={sessionId}
          csvRowIndex={csvRowIndex}
          accountId={accountId}
          onSuccess={() => {
            setShowAddDialog(false);
            onUpdate();
          }}
        />
      )}

      {showTransactionDetail && selectedTransaction && (
        <TransactionDetailDialog
          open={showTransactionDetail}
          onOpenChange={setShowTransactionDetail}
          transaction={selectedTransaction}
        />
      )}
    </>
  );
}

