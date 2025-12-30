"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { useCurrency } from "@/hooks/useCurrency";
import { toast } from "sonner";
import { format } from "date-fns";
import { PlusIcon, TrashIcon } from "@radix-ui/react-icons";
import { FileUpload } from "@/components/transactions/FileUpload";
import { 
  getTransactionAttachments, 
  deleteAttachment, 
  linkAttachmentsToTransaction,
  getTransaction,
  updateTransactionWithItems,
} from "@/actions/transactions";
import { getDriveThumbnailUrl } from "@/lib/utils/google-drive";
import {
  generateIncomeLinesFromItems,
  generateExpenseLinesFromItems,
  generateTransferLines,
} from "@/lib/accounting/double-entry";
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

type Account = Database["public"]["Tables"]["chart_of_accounts"]["Row"];

interface EditTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  onSave?: () => void;
}

interface LineItem {
  id: string;
  description: string;
  amount: string;
  expenseAccountId: string;
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

export function EditTransactionDialog({
  open,
  onOpenChange,
  transaction,
  onSave,
}: EditTransactionDialogProps) {
  const { getAccountsByType } = useAccounts();
  const { format: formatCurrency } = useCurrency();
  
  const [loading, setLoading] = useState(false);
  const [fullTransaction, setFullTransaction] = useState<Transaction | null>(null);
  const [date, setDate] = useState("");
  const [assetAccountId, setAssetAccountId] = useState("");
  const [payer, setPayer] = useState("");
  const [payee, setPayee] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<FileAttachment[]>([]);
  const [newAttachments, setNewAttachments] = useState<FileAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);

  // For income/expense with line items
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  // For transfer
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [hasFee, setHasFee] = useState(false);
  const [feeAmount, setFeeAmount] = useState("");
  const [feeAccountId, setFeeAccountId] = useState("");

  useEffect(() => {
    if (transaction && open) {
      loadFullTransaction();
    } else {
      // Reset state when dialog closes
      setFullTransaction(null);
      setExistingAttachments([]);
      setNewAttachments([]);
      setAttachments([]);
    }
  }, [transaction, open]);

  const loadFullTransaction = async () => {
    if (!transaction?.id) return;
    
    try {
      const data = await getTransaction(transaction.id);
      setFullTransaction(data as unknown as Transaction);
      loadTransactionData(data as unknown as Transaction);
      loadAttachments();
    } catch (error) {
      console.error("Failed to load transaction:", error);
      toast.error("Failed to load transaction details");
    }
  };

  const loadTransactionData = (txn: Transaction) => {
    // Basic fields
    setDate(format(new Date(txn.transaction_date), "yyyy-MM-dd"));
    setPayer(txn.payee_payer || "");
    setPayee(txn.payee_payer || "");
    setTransactionId(txn.transaction_id || "");

    if (txn.type === "transfer") {
      // Load transfer data
      setDescription(txn.description);
      setAmount(txn.amount.toString());
      
      // Extract from/to accounts from transaction_lines
      // From account = account with credit_amount (money goes out)
      // To account = account with debit_amount (money comes in)
      if (txn.transaction_lines && txn.transaction_lines.length >= 2) {
        const toAccountLine = txn.transaction_lines.find(
          l => l.debit_amount && l.account?.type === "asset"
        );
        const fromAccountLine = txn.transaction_lines.find(
          l => l.credit_amount && l.account?.type === "asset"
        );
        
        if (toAccountLine) setToAccountId(toAccountLine.account_id);
        if (fromAccountLine) setFromAccountId(fromAccountLine.account_id);
      }
      
      // Check for fee (expense account with debit)
      const feeLine = txn.transaction_lines?.find(
        l => l.account?.type === "expense" && l.debit_amount
      );
      if (feeLine) {
        setHasFee(true);
        setFeeAmount(feeLine.debit_amount?.toString() || "");
        setFeeAccountId(feeLine.account_id);
      }
    } else {
      // Load income/expense data with line items
      if (txn.transaction_line_items && txn.transaction_line_items.length > 0) {
        // Has line items
        setLineItems(
          txn.transaction_line_items.map((item, index) => ({
            id: item.id || `item-${index}`,
            description: item.description,
            amount: item.amount.toString(),
            expenseAccountId: item.expense_account_id || "",
            incomeAccountId: item.income_account_id || "",
          }))
        );
      } else {
        // Single line item (legacy format)
        setLineItems([
          {
            id: "1",
            description: txn.description,
            amount: txn.amount.toString(),
            expenseAccountId: "",
            incomeAccountId: "",
          },
        ]);
      }

      // Extract asset account from transaction_lines
      const assetLine = txn.transaction_lines?.find(
        l => l.account?.type === "asset"
      );
      if (assetLine) {
        setAssetAccountId(assetLine.account_id);
      }
    }
  };

  const loadAttachments = async () => {
    if (!transaction?.id) return;
    
    setLoadingAttachments(true);
    try {
      const data = await getTransactionAttachments(transaction.id);
      setExistingAttachments(
        data.map((att: any) => ({
          id: att.id,
          filename: att.filename,
          mimeType: att.mime_type,
          fileSize: att.file_size,
          driveFileId: att.drive_file_id,
          driveWebViewLink: att.drive_web_view_link,
          driveDownloadLink: att.drive_download_link,
          preview: att.mime_type.startsWith("image/") && att.drive_file_id
            ? getDriveThumbnailUrl(att.drive_file_id)
            : undefined,
        }))
      );
    } catch (error) {
      console.error("Failed to load attachments:", error);
    } finally {
      setLoadingAttachments(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      await deleteAttachment(attachmentId);
      setExistingAttachments((prev) => prev.filter((att) => att.id !== attachmentId));
      toast.success("Attachment deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete attachment");
    }
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { id: Date.now().toString(), description: "", amount: "", expenseAccountId: "", incomeAccountId: "" },
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

  const handleSave = async () => {
    if (!fullTransaction) return;

    setLoading(true);
    const newAttachmentIds = newAttachments.map((att) => att.id);

    try {
      if (fullTransaction.type === "transfer") {
        // Handle transfer update
        if (!fromAccountId || !toAccountId || !amount || !description) {
          toast.error("Please fill in all required fields");
          setLoading(false);
          return;
        }

        if (fromAccountId === toAccountId) {
          toast.error("From and To accounts must be different");
          setLoading(false);
          return;
        }

        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
          toast.error("Please enter a valid amount");
          setLoading(false);
          return;
        }

        let feeAmountNum: number | undefined;
        if (hasFee) {
          if (!feeAccountId || !feeAmount) {
            toast.error("Please fill in fee details");
            setLoading(false);
            return;
          }
          feeAmountNum = parseFloat(feeAmount);
          if (isNaN(feeAmountNum) || feeAmountNum < 0) {
            toast.error("Please enter a valid fee amount");
            setLoading(false);
            return;
          }
        }

        const lines = generateTransferLines(
          fromAccountId,
          toAccountId,
          amountNum,
          feeAccountId || undefined,
          feeAmountNum
        );

        await updateTransactionWithItems(fullTransaction.id, {
          transaction_date: date,
          description,
          amount: amountNum,
          lines,
          lineItems: [], // Transfer doesn't use line items
        });
      } else {
        // Handle income/expense update
        if (!assetAccountId) {
          toast.error("Please select an asset account");
          setLoading(false);
          return;
        }

        const hasInvalidItems = lineItems.some((item) => {
          if (fullTransaction.type === "income") {
            return !item.description || !item.amount || !item.incomeAccountId;
          } else {
            return !item.description || !item.amount || !item.expenseAccountId;
          }
        });

        if (hasInvalidItems) {
          toast.error("Please fill in all fields for all line items");
          setLoading(false);
          return;
        }

        const hasInvalidAmounts = lineItems.some((item) => {
          const amountNum = parseFloat(item.amount);
          return isNaN(amountNum) || amountNum <= 0;
        });

        if (hasInvalidAmounts) {
          toast.error("Please enter valid amounts for all line items");
          setLoading(false);
          return;
        }

        const totalAmount = calculateSubtotal();
        const mainDescription =
          lineItems.length === 1
            ? lineItems[0].description
            : `Multiple items (${lineItems.length} items)`;

        const lines =
          fullTransaction.type === "income"
            ? generateIncomeLinesFromItems(
                lineItems.map((item) => ({
                  incomeAccountId: item.incomeAccountId,
                  amount: parseFloat(item.amount),
                })),
                assetAccountId
              )
            : generateExpenseLinesFromItems(
                lineItems.map((item) => ({
                  expenseAccountId: item.expenseAccountId,
                  amount: parseFloat(item.amount),
                })),
                assetAccountId
              );

        const lineItemsData = lineItems.map((item) => ({
          description: item.description,
          amount: parseFloat(item.amount),
          ...(fullTransaction.type === "income"
            ? { income_account_id: item.incomeAccountId }
            : { expense_account_id: item.expenseAccountId }),
        }));

        await updateTransactionWithItems(fullTransaction.id, {
          transaction_date: date,
          description: mainDescription,
          amount: totalAmount,
          payee_payer: fullTransaction.type === "income" ? payee : payer,
          transaction_id: transactionId || undefined,
          lines,
          lineItems: lineItemsData,
        });
      }

      // Link new attachments if any were uploaded
      if (newAttachmentIds.length > 0) {
        try {
          await linkAttachmentsToTransaction(fullTransaction.id, newAttachmentIds);
        } catch (linkError) {
          console.error("Failed to link attachments:", linkError);
          for (const attachmentId of newAttachmentIds) {
            try {
              await deleteAttachment(attachmentId);
            } catch (cleanupError) {
              console.error("Failed to cleanup attachment:", cleanupError);
            }
          }
          throw new Error("Transaction updated but failed to link attachments");
        }
      }

      toast.success("Transaction updated successfully");
      setNewAttachments([]);
      await loadAttachments();
      onSave?.();
      onOpenChange(false);
    } catch (error) {
      // Cleanup uploaded files if transaction update fails
      if (newAttachmentIds.length > 0) {
        for (const attachmentId of newAttachmentIds) {
          try {
            await deleteAttachment(attachmentId);
          } catch (cleanupError) {
            console.error("Failed to cleanup attachment:", cleanupError);
          }
        }
      }
      toast.error(error instanceof Error ? error.message : "Failed to update transaction");
    } finally {
      setLoading(false);
    }
  };

  if (!fullTransaction) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const expenseAccounts = getAccountsByType("expense").filter((a: Account) => a.is_active);
  const incomeAccounts = getAccountsByType("income").filter((a: Account) => a.is_active);
  const assetAccounts = getAccountsByType("asset").filter((a: Account) => a.is_active);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit {fullTransaction.type.charAt(0).toUpperCase() + fullTransaction.type.slice(1)} Transaction
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {fullTransaction.type === "transfer" ? (
            <>
              {/* Transfer Form */}
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

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
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
                  <Label htmlFor="from-account">From Account *</Label>
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
                  <Label htmlFor="to-account">To Account *</Label>
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
                <Label htmlFor="transaction-id">Transaction ID (Optional)</Label>
                <Input
                  id="transaction-id"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="Reference number"
                />
              </div>
            </>
          ) : (
            <>
              {/* Income/Expense Form */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payer-payee">
                    {fullTransaction.type === "income" ? "Payee" : "Paid To"} (Optional)
                  </Label>
                  <Input
                    id="payer-payee"
                    value={fullTransaction.type === "income" ? payee : payer}
                    onChange={(e) => {
                      if (fullTransaction.type === "income") {
                        setPayee(e.target.value);
                      } else {
                        setPayer(e.target.value);
                      }
                    }}
                    placeholder={fullTransaction.type === "income" ? "Who paid you" : "Merchant or recipient"}
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
                  <Label htmlFor="asset-account">
                    {fullTransaction.type === "income" ? "Receive To" : "Pay From"} (Asset) *
                  </Label>
                  <Select value={assetAccountId} onValueChange={setAssetAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder={`Select asset account`} />
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
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40%]">Description</TableHead>
                        <TableHead className="w-[25%]">Amount</TableHead>
                        <TableHead className="w-[30%]">
                          {fullTransaction.type === "income" ? "Income Account" : "Expense Account"}
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
                              placeholder={fullTransaction.type === "income" ? "e.g., Salary, Bonus" : "e.g., Moisturizer, Snacks"}
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
                              value={fullTransaction.type === "income" ? item.incomeAccountId : item.expenseAccountId}
                              onValueChange={(value) =>
                                updateLineItem(
                                  item.id,
                                  fullTransaction.type === "income" ? "incomeAccountId" : "expenseAccountId",
                                  value
                                )
                              }
                            >
                              <SelectTrigger className="border-0 focus:ring-1">
                                <SelectValue placeholder="Select account" />
                              </SelectTrigger>
                              <SelectContent>
                                {(fullTransaction.type === "income" ? incomeAccounts : expenseAccounts).map((account: Account) => (
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
            </>
          )}

          {/* Existing Attachments */}
          {existingAttachments.length > 0 && (
            <div className="space-y-2">
              <Label>Existing Attachments</Label>
              <div className="grid grid-cols-2 gap-2">
                {existingAttachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-2 border rounded text-sm"
                  >
                    <span className="truncate flex-1" title={attachment.filename}>
                      {attachment.filename}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive ml-2"
                      onClick={() => handleDeleteAttachment(attachment.id)}
                      disabled={loading}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Attachments */}
          <div className="space-y-2">
            <Label>Add Attachments (Optional)</Label>
            <FileUpload
              attachments={newAttachments}
              onFilesChange={setNewAttachments}
              disabled={loading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
