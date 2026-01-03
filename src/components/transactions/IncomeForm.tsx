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
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAccounts } from "@/hooks/useAccounts";
import { useTransactions } from "@/hooks/useTransactions";
import { useCurrency } from "@/hooks/useCurrency";
import { toast } from "sonner";
import { format } from "date-fns";
import type { Database } from "@/lib/supabase/types";
import { PlusIcon, TrashIcon } from "@radix-ui/react-icons";
import { FileUpload } from "@/components/transactions/FileUpload";
import { deleteAttachment } from "@/actions/transactions";

type Account = Database["public"]["Tables"]["chart_of_accounts"]["Row"];

interface IncomeFormProps {
  onSuccess?: () => void;
}

interface LineItem {
  id: string;
  description: string;
  amount: string;
  incomeAccountId: string;
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

export function IncomeForm({ onSuccess }: IncomeFormProps) {
  const { getAccountsByType } = useAccounts();
  const { createIncomeWithItems } = useTransactions();

  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [assetAccountId, setAssetAccountId] = useState("");
  const [payee, setPayee] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: "1", description: "", amount: "", incomeAccountId: "" },
  ]);

  const incomeAccounts = getAccountsByType("income").filter((a: Account) => a.is_active);
  const assetAccounts = getAccountsByType("asset").filter((a: Account) => a.is_active);

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { id: Date.now().toString(), description: "", amount: "", incomeAccountId: "" },
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

    if (!assetAccountId) {
      toast.error("Please select an asset account");
      return;
    }

    // Validate line items
    const hasInvalidItems = lineItems.some(
      (item) => !item.description || !item.amount || !item.incomeAccountId
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

    setLoading(true);
    const attachmentIds = attachments.map((att) => att.id);
    
    try {
      await createIncomeWithItems(
        date,
        lineItems.map((item) => ({
          description: item.description,
          amount: parseFloat(item.amount),
          incomeAccountId: item.incomeAccountId,
        })),
        assetAccountId,
        payee || undefined,
        undefined, // transactionId
        assetAccounts.find((a) => a.id === assetAccountId)?.currency || undefined, // currency
        undefined, // exchangeRate
        attachmentIds.length > 0 ? attachmentIds : undefined
      );

      // Reset form
      setLineItems([{ id: "1", description: "", amount: "", incomeAccountId: "" }]);
      setPayee("");
      setTransactionId("");
      setAttachments([]);
      setDate(format(new Date(), "yyyy-MM-dd"));

      toast.success("Income transaction created successfully");
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
      toast.error(error instanceof Error ? error.message : "Failed to create income");
    } finally {
      setLoading(false);
    }
  };

  const { format: formatCurrency } = useCurrency();

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="payee">Payee (Optional)</Label>
          <Input
            id="payee"
            value={payee}
            onChange={(e) => setPayee(e.target.value)}
            placeholder="Who paid you"
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <Label htmlFor="asset-account">Receive To (Asset) *</Label>
          <Select value={assetAccountId} onValueChange={setAssetAccountId}>
            <SelectTrigger>
              <SelectValue placeholder="Select asset account" />
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

      <div className="space-y-2">
        <Label>Line Items *</Label>
        
        {/* Mobile View: Stacked Cards */}
        <div className="space-y-4 md:hidden">
            {lineItems.map((item, index) => (
                <div key={item.id} className="p-4 border rounded-lg space-y-3 bg-card">
                    <div className="flex justify-between items-center">
                        <h4 className="font-medium text-sm text-muted-foreground">Item {index + 1}</h4>
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
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Description</Label>
                        <Input
                            value={item.description}
                            onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                            placeholder="Description"
                            required
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Amount</Label>
                        <Input
                           type="number"
                           step="0.01"
                           value={item.amount}
                           onChange={(e) => updateLineItem(item.id, "amount", e.target.value)}
                           placeholder="0.00"
                           required
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Income Account</Label>
                        <Select
                            value={item.incomeAccountId}
                            onValueChange={(value) => updateLineItem(item.id, "incomeAccountId", value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select account" />
                            </SelectTrigger>
                            <SelectContent>
                                {incomeAccounts.map((account: Account) => (
                                    <SelectItem key={account.id} value={account.id}>
                                        {account.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            ))}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Description</TableHead>
                <TableHead className="w-[25%]">Amount</TableHead>
                <TableHead className="w-[30%]">Income Account</TableHead>
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
                      placeholder="e.g., Salary, Bonus, Freelance"
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
                      value={item.incomeAccountId}
                      onValueChange={(value) =>
                        updateLineItem(item.id, "incomeAccountId", value)
                      }
                    >
                      <SelectTrigger className="border-0 focus:ring-1">
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {incomeAccounts.map((account: Account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                          </SelectItem>
                        ))}
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
                  {formatCurrency(calculateSubtotal(), { currency: assetAccounts.find((a) => a.id === assetAccountId)?.currency || undefined })}
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

      <div className="space-y-2">
        <Label>Attachments (Optional)</Label>
        <FileUpload
          attachments={attachments}
          onFilesChange={setAttachments}
          disabled={loading}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Income"}
        </Button>
      </div>
    </form>
  );
}
