"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeftIcon, CheckIcon } from "@radix-ui/react-icons";
import type { ReconciliationSession, ReconciliationMatch } from "@/actions/reconciliation";
import { CSVTransactionRow } from "./CSVTransactionRow";
import { useCurrency } from "@/hooks/useCurrency";
import { useAccounts } from "@/hooks/useAccounts";
import { getTransactions } from "@/actions/transactions";
import { autoMatchAllTransactions, completeReconciliationSession } from "@/actions/reconciliation";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface ReconciliationViewProps {
  session: ReconciliationSession & { matches: ReconciliationMatch[] };
  onBack: () => void;
  onUpdate: () => void;
}

export function ReconciliationView({
  session,
  onBack,
  onUpdate,
}: ReconciliationViewProps) {
  const { format: formatCurrency } = useCurrency();
  const { accounts } = useAccounts();
  const [loading, setLoading] = useState(false);

  const account = accounts.find((a) => a.id === session.account_id);

  // Calculate match statistics
  const totalTransactions = session.parsed_data.transactions.length;
  const matchedCount = session.matches.filter((m) => m.transaction_id !== null).length;
  const unmatchedCount = totalTransactions - matchedCount;
  const progress = totalTransactions > 0 ? (matchedCount / totalTransactions) * 100 : 0;

  const handleAutoMatch = async () => {
    try {
      setLoading(true);
      await autoMatchAllTransactions(session.id);
      toast.success("Auto-matching completed");
      onUpdate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to auto-match");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    try {
      setLoading(true);
      await completeReconciliationSession(session.id);
      toast.success("Reconciliation completed");
      onUpdate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to complete reconciliation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{session.filename}</h2>
            <p className="text-sm text-muted-foreground">
              Account: {account?.name || "Unknown"} • {format(new Date(session.created_at), "MMM d, yyyy")}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleAutoMatch}
            disabled={loading || session.status === "completed"}
          >
            Auto-Match All
          </Button>
          {session.status === "in_progress" && (
            <Button
              onClick={handleComplete}
              disabled={loading || unmatchedCount > 0}
            >
              <CheckIcon className="mr-2 h-4 w-4" />
              Complete
            </Button>
          )}
        </div>
      </div>

      {/* Statistics */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="space-y-1">
            <p className="text-sm font-medium">Reconciliation Progress</p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Matched: {matchedCount} / {totalTransactions}</span>
              <span>Unmatched: {unmatchedCount}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{Math.round(progress)}%</p>
          </div>
        </div>
        <Progress value={progress} className="mt-2" />
      </Card>

      {/* Transactions Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Match</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {session.parsed_data.transactions.map((csvTransaction, index) => {
                const match = session.matches.find((m) => m.csv_row_index === index);
                return (
                  <CSVTransactionRow
                    key={index}
                    csvTransaction={csvTransaction}
                    match={match || null}
                    sessionId={session.id}
                    csvRowIndex={index}
                    accountId={session.account_id}
                    onUpdate={onUpdate}
                  />
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

