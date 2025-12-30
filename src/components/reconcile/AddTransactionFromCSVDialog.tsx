"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ParsedCSVTransaction } from "@/lib/utils/csv-parser";
import { createTransactionFromCSVRow } from "@/actions/reconciliation";
import { useAccounts } from "@/hooks/useAccounts";
import { useCurrency } from "@/hooks/useCurrency";
import { toast } from "sonner";
import type { Database } from "@/lib/supabase/types";
import { FileUpload } from "@/components/transactions/FileUpload";
import { deleteAttachment } from "@/actions/transactions";
import { format } from "date-fns";
import { PlusIcon, TrashIcon } from "@radix-ui/react-icons";

type Account = Database["public"]["Tables"]["chart_of_accounts"]["Row"];

interface FileAttachment {
  id: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  driveWebViewLink: string;
  driveDownloadLink: string;
  preview?: string;
}

interface LineItem {
  id: string;
  description: string;
  amount: string;
  expenseAccountId?: string;
  incomeAccountId?: string;
}

interface AddTransactionFromCSVDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  csvTransaction: ParsedCSVTransaction;
  sessionId: string;
  csvRowIndex: number;
  accountId: string;
  onSuccess: () => void;
}

export function AddTransactionFromCSVDialog({
  open,
  onOpenChange,
  csvTransaction,
  sessionId,
  csvRowIndex,
  accountId,
  onSuccess,
}: AddTransactionFromCSVDialogProps) {
  const { getAccountsByType } = useAccounts();
  const { format: formatCurrency } = useCurrency();
  const [loading, setLoading] = useState(false);
  
  // Transaction type
  const [type, setType] = useState<"income" | "expense" | "transfer">(
    csvTransaction.type === "credit" ? "income" : "expense"
  );
  
  // Basic fields
  const [date, setDate] = useState(csvTransaction.date);
  const [description, setDescription] = useState(csvTransaction.description);
  const [payee, setPayee] = useState("");
  const [transactionId, setTransactionId] = useState("");
  
  // Line items for income/expense
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: "1",
      description: csvTransaction.description,
      amount: csvTransaction.amount.toString(),
      expenseAccountId: type === "expense" ? "" : undefined,
      incomeAccountId: type === "income" ? "" : undefined,
    },
  ]);
  
  // Transfer fields
  const [fromAccountId, setFromAccountId] = useState(accountId);
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState(csvTransaction.amount.toString());
  const [hasFee, setHasFee] = useState(false);
  const [feeAmount, setFeeAmount] = useState("");
  const [feeAccountId, setFeeAccountId] = useState("");
  
  // Attachments
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);

  const expenseAccounts = getAccountsByType("expense").filter((a: Account) => a.is_active);
  const incomeAccounts = getAccountsByType("income").filter((a: Account) => a.is_active);
  const assetAccounts = getAccountsByType("asset").filter((a: Account) => a.is_active);

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: Date.now().toString(),
        description: "",
        amount: "",
        expenseAccountId: type === "expense" ? "" : undefined,
        incomeAccountId: type === "income" ? "" : undefined,
      },
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((item) => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string) => {
    setLineItems(
      lineItems.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => {
      const amount = parseFloat(item.amount) || 0;
      return sum + amount;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate based on type
    if (type === "income" || type === "expense") {
      // Validate line items
      const hasInvalidItems = lineItems.some(
        (item) =>
          !item.description ||
          !item.amount ||
          (type === "expense" && !item.expenseAccountId) ||
          (type === "income" && !item.incomeAccountId)
      );

      if (hasInvalidItems) {
        toast.error("Please fill in all fields for all line items");
        return;
      }

      const hasInvalidAmounts = lineItems.some((item) => {
        const amountNum = parseFloat(item.amount);
        return isNaN(amountNum) || amountNum <= 0;
      });

      if (hasInvalidAmounts) {
        toast.error("Please enter valid amounts for all line items");
        return;
      }
    }

    if (type === "transfer") {
      if (!fromAccountId || !toAccountId) {
        toast.error("Please select both From and To accounts");
        return;
      }
      if (fromAccountId === toAccountId) {
        toast.error("From and To accounts must be different");
        return;
      }
      if (hasFee && (!feeAccountId || !feeAmount)) {
        toast.error("Please fill in fee details");
        return;
      }

      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        toast.error("Please enter a valid amount");
        return;
      }

      let feeAmountNum: number | undefined;
      if (hasFee) {
        feeAmountNum = parseFloat(feeAmount);
        if (isNaN(feeAmountNum) || feeAmountNum < 0) {
          toast.error("Please enter a valid fee amount");
          return;
        }
      }

      try {
        setLoading(true);
        const attachmentIds = attachments.map((att) => att.id);

        await createTransactionFromCSVRow(sessionId, csvRowIndex, {
          type: "transfer",
          transaction_date: date,
          amount: amountNum,
          description: description || csvTransaction.description,
          payee: payee || undefined,
          transaction_id: transactionId || undefined,
          fromAccountId,
          toAccountId,
          feeAmount: hasFee ? feeAmountNum : undefined,
          feeAccountId: hasFee ? feeAccountId : undefined,
          attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined,
        });

        toast.success("Transaction created and matched");
        onSuccess();
        onOpenChange(false);
        return;
      } catch (error) {
        if (attachments.length > 0) {
          for (const attachment of attachments) {
            try {
              await deleteAttachment(attachment.id);
            } catch (cleanupError) {
              console.error("Failed to cleanup attachment:", cleanupError);
            }
          }
        }
        toast.error(error instanceof Error ? error.message : "Failed to create transaction");
        return;
      } finally {
        setLoading(false);
      }
    }

    // Handle income/expense with line items
    try {
      setLoading(true);
      const attachmentIds = attachments.map((att) => att.id);

      await createTransactionFromCSVRow(sessionId, csvRowIndex, {
        type,
        transaction_date: date,
        description: description || csvTransaction.description,
        payee: payee || undefined,
        transaction_id: transactionId || undefined,
        lineItems: lineItems.map((item) => ({
          description: item.description,
          amount: parseFloat(item.amount),
          expenseAccountId: type === "expense" ? item.expenseAccountId : undefined,
          incomeAccountId: type === "income" ? item.incomeAccountId : undefined,
        })),
        attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined,
      });

      toast.success("Transaction created and matched");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      if (attachments.length > 0) {
        for (const attachment of attachments) {
          try {
            await deleteAttachment(attachment.id);
          } catch (cleanupError) {
            console.error("Failed to cleanup attachment:", cleanupError);
          }
        }
      }
      toast.error(error instanceof Error ? error.message : "Failed to create transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Transaction from CSV</DialogTitle>
          <DialogDescription>
            Create a new transaction to match this CSV entry
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium">CSV Transaction Details:</p>
            <div className="text-sm space-y-1 text-muted-foreground">
              <p>Date: {format(new Date(csvTransaction.date), "MMM d, yyyy")}</p>
              <p>Amount: {formatCurrency(csvTransaction.amount)}</p>
              <p>Type: {csvTransaction.type === "credit" ? "Credit" : "Debit"}</p>
              <p>Description: {csvTransaction.description}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Transaction Type *</Label>
              <Select value={type} onValueChange={(v) => setType(v as "income" | "expense" | "transfer")}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {(type === "income" || type === "expense") && (
            <div className="space-y-2">
              <Label>Line Items *</Label>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Description</TableHead>
                      <TableHead className="w-[25%]">Amount</TableHead>
                      <TableHead className="w-[30%]">
                        {type === "expense" ? "Expense Account" : "Income Account"}
                      </TableHead>
                      <TableHead className="w-[5%]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Input
                            value={item.description}
                            onChange={(e) =>
                              updateLineItem(item.id, "description", e.target.value)
                            }
                            placeholder="e.g., Item description"
                            required
                            className="border-0 focus-visible:ring-1"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.amount}
                            onChange={(e) => updateLineItem(item.id, "amount", e.target.value)}
                            placeholder="0.00"
                            required
                            className="border-0 focus-visible:ring-1"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={
                              type === "expense"
                                ? item.expenseAccountId || ""
                                : item.incomeAccountId || ""
                            }
                            onValueChange={(value) =>
                              updateLineItem(
                                item.id,
                                type === "expense" ? "expenseAccountId" : "incomeAccountId",
                                value
                              )
                            }
                          >
                            <SelectTrigger className="border-0 focus:ring-1">
                              <SelectValue placeholder="Select account" />
                            </SelectTrigger>
                            <SelectContent>
                              {(type === "expense" ? expenseAccounts : incomeAccounts).map(
                                (account: Account) => (
                                  <SelectItem key={account.id} value={account.id}>
                                    {account.name}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {lineItems.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeLineItem(item.id)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={2} className="text-right font-medium">
                        Subtotal:
                      </TableCell>
                      <TableCell colSpan={2} className="font-bold text-lg">
                        {formatCurrency(calculateSubtotal())}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={addLineItem}
                className="w-full"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Line Item
              </Button>
            </div>
          )}

          {type === "transfer" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="from-account">From Account *</Label>
                  <Select value={fromAccountId} onValueChange={setFromAccountId} required>
                    <SelectTrigger id="from-account">
                      <SelectValue placeholder="Select source account" />
                    </SelectTrigger>
                    <SelectContent>
                      {assetAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="to-account">To Account *</Label>
                  <Select value={toAccountId} onValueChange={setToAccountId} required>
                    <SelectTrigger id="to-account">
                      <SelectValue placeholder="Select destination account" />
                    </SelectTrigger>
                    <SelectContent>
                      {assetAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="has-fee"
                    checked={hasFee}
                    onCheckedChange={(checked) => setHasFee(checked === true)}
                  />
                  <Label htmlFor="has-fee" className="cursor-pointer">
                    Include transfer fee
                  </Label>
                </div>

                {hasFee && (
                  <div className="grid grid-cols-2 gap-4 pl-6">
                    <div className="space-y-2">
                      <Label htmlFor="fee-amount">Fee Amount *</Label>
                      <Input
                        id="fee-amount"
                        type="number"
                        step="0.01"
                        value={feeAmount}
                        onChange={(e) => setFeeAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fee-account">Fee Account *</Label>
                      <Select value={feeAccountId} onValueChange={setFeeAccountId}>
                        <SelectTrigger id="fee-account">
                          <SelectValue placeholder="Select expense account" />
                        </SelectTrigger>
                        <SelectContent>
                          {expenseAccounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Transaction description"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payee">Payee/Payer (Optional)</Label>
              <Input
                id="payee"
                value={payee}
                onChange={(e) => setPayee(e.target.value)}
                placeholder="Who paid or received"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="transaction-id">Transaction ID (Optional)</Label>
              <Input
                id="transaction-id"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="Reference number"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Attachments (Optional)</Label>
            <FileUpload
              attachments={attachments}
              onFilesChange={setAttachments}
              disabled={loading}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Transaction"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
