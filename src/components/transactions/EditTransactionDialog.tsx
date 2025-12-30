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
import type { Database } from "@/lib/supabase/types";
import { toast } from "sonner";
import { format } from "date-fns";
import { FileUpload } from "@/components/transactions/FileUpload";
import { getTransactionAttachments, deleteAttachment, linkAttachmentsToTransaction } from "@/actions/transactions";
import { getDriveThumbnailUrl } from "@/lib/utils/google-drive";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];

interface EditTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  onSave: (id: string, data: {
    transaction_date: string;
    description: string;
    amount: number;
    payee_payer?: string;
    transaction_id?: string;
  }) => Promise<void>;
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
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [payee, setPayee] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [existingAttachments, setExistingAttachments] = useState<FileAttachment[]>([]);
  const [newAttachments, setNewAttachments] = useState<FileAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);

  useEffect(() => {
    if (transaction && open) {
      setDate(format(new Date(transaction.transaction_date), "yyyy-MM-dd"));
      setDescription(transaction.description);
      setAmount(transaction.amount.toString());
      setPayee(transaction.payee_payer || "");
      setTransactionId(transaction.transaction_id || "");
      loadAttachments();
    } else {
      setExistingAttachments([]);
      setNewAttachments([]);
    }
  }, [transaction, open]);

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

  const handleSave = async () => {
    if (!transaction || !date || !description || !amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setLoading(true);
    const newAttachmentIds = newAttachments.map((att) => att.id);
    
    try {
      await onSave(transaction.id, {
        transaction_date: date,
        description,
        amount: amountNum,
        payee_payer: payee || undefined,
        transaction_id: transactionId || undefined,
      });

      // Link new attachments to transaction if any were uploaded
      if (newAttachmentIds.length > 0) {
        try {
          await linkAttachmentsToTransaction(transaction.id, newAttachmentIds);
        } catch (linkError) {
          console.error("Failed to link attachments:", linkError);
          // Cleanup uploaded files if linking fails
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
      await loadAttachments(); // Reload to show newly linked attachments
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-date">Date *</Label>
            <Input
              id="edit-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description *</Label>
            <Input
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-amount">Amount *</Label>
            <Input
              id="edit-amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-payee">
              {transaction?.type === "income" ? "Payee" : "Payer"} (Optional)
            </Label>
            <Input
              id="edit-payee"
              value={payee}
              onChange={(e) => setPayee(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-transaction-id">Transaction ID (Optional)</Label>
            <Input
              id="edit-transaction-id"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
            />
          </div>

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

