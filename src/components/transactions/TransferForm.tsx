"use client";

import { useState } from "react";
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
import { useAccounts } from "@/hooks/useAccounts";
import { useTransactions } from "@/hooks/useTransactions";
import { toast } from "sonner";
import { format } from "date-fns";
import type { Database } from "@/lib/supabase/types";
import { FileUpload } from "@/components/transactions/FileUpload";
import { deleteAttachment } from "@/actions/transactions";

type Account = Database["public"]["Tables"]["chart_of_accounts"]["Row"];

interface TransferFormProps {
  onSuccess?: () => void;
}

interface FileAttachment {
  id: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  driveWebViewLink: string;
  driveDownloadLink: string;
  preview?: string;
}

export function TransferForm({ onSuccess }: TransferFormProps) {
  const { getAccountsByType } = useAccounts();
  const { createTransfer } = useTransactions();

  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [hasFee, setHasFee] = useState(false);
  const [feeAmount, setFeeAmount] = useState("");
  const [feeAccountId, setFeeAccountId] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);

  const assetAccounts = getAccountsByType("asset").filter((a: Account) => a.is_active);
  const expenseAccounts = getAccountsByType("expense").filter((a: Account) => a.is_active);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fromAccountId || !toAccountId || !amount || !description) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (fromAccountId === toAccountId) {
      toast.error("From and To accounts must be different");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    let feeAmountNum: number | undefined;
    if (hasFee) {
      if (!feeAccountId || !feeAmount) {
        toast.error("Please fill in fee details");
        return;
      }
      feeAmountNum = parseFloat(feeAmount);
      if (isNaN(feeAmountNum) || feeAmountNum < 0) {
        toast.error("Please enter a valid fee amount");
        return;
      }
    }

    setLoading(true);
    const attachmentIds = attachments.map((att) => att.id);
    
    try {
      await createTransfer(
        date,
        description,
        amountNum,
        fromAccountId,
        toAccountId,
        feeAmountNum,
        feeAccountId || undefined,
        assetAccounts.find((a) => a.id === fromAccountId)?.currency || undefined, // currency
        undefined, // exchangeRate
        attachmentIds.length > 0 ? attachmentIds : undefined
      );

      // Reset form
      setDescription("");
      setAmount("");
      setFeeAmount("");
      setHasFee(false);
      setTransactionId("");
      setAttachments([]);
      setDate(format(new Date(), "yyyy-MM-dd"));

      toast.success("Transfer transaction created successfully");
      onSuccess?.();
    } catch (error) {
      // Cleanup uploaded files if transaction creation or linking fails
      if (attachmentIds.length > 0) {
        for (const attachmentId of attachmentIds) {
          try {
            await deleteAttachment(attachmentId);
          } catch (cleanupError) {
            console.error("Failed to cleanup attachment:", cleanupError);
          }
        }
      }
      toast.error(error instanceof Error ? error.message : "Failed to create transfer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">
            Date *
          </Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">
            Amount *
          </Label>
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

      <div className="space-y-2">
        <Label htmlFor="description">
          Description *
        </Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., Transfer to savings"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="from-account">
            From Account *
          </Label>
          <Select value={fromAccountId} onValueChange={setFromAccountId}>
            <SelectTrigger>
              <SelectValue placeholder="Select source account" />
            </SelectTrigger>
            <SelectContent>
              {assetAccounts.map((account: Account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="to-account">
            To Account *
          </Label>
          <Select value={toAccountId} onValueChange={setToAccountId}>
            <SelectTrigger>
              <SelectValue placeholder="Select destination account" />
            </SelectTrigger>
            <SelectContent>
              {assetAccounts.map((account: Account) => (
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
          <input
            type="checkbox"
            id="has-fee"
            checked={hasFee}
            onChange={(e) => setHasFee(e.target.checked)}
            className="w-4 h-4"
          />
          <Label htmlFor="has-fee" className="cursor-pointer">
            Include transfer fee
          </Label>
        </div>

        {hasFee && (
          <div className="grid grid-cols-2 gap-4 pl-6">
            <div className="space-y-2">
              <Label htmlFor="fee-amount">
                Fee Amount *
              </Label>
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
              <Label htmlFor="fee-account">
                Fee Account *
              </Label>
              <Select value={feeAccountId} onValueChange={setFeeAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select expense account" />
                </SelectTrigger>
                <SelectContent>
                  {expenseAccounts.map((account: Account) => (
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

      <div className="space-y-2">
        <Label htmlFor="transaction-id">
          Transaction ID (Optional)
        </Label>
        <Input
          id="transaction-id"
          value={transactionId}
          onChange={(e) => setTransactionId(e.target.value)}
          placeholder="Reference number"
        />
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
        <Button
          type="submit"
          disabled={loading}
        >
          {loading ? "Creating..." : "Create Transfer"}
        </Button>
      </div>
    </form>
  );
}
