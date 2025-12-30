"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/hooks/useCurrency";
import { format } from "date-fns";
import type { Database } from "@/lib/supabase/types";
import { getTransactionAttachments } from "@/actions/transactions";
import { FileTextIcon, ExternalLinkIcon } from "@radix-ui/react-icons";
import { X } from "lucide-react";
import { getDriveThumbnailUrl, getDriveFullImageUrl } from "@/lib/utils/google-drive";

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
  transaction_attachments?: Array<{
    id: string;
    filename: string;
    mime_type: string;
    file_size: number;
    drive_web_view_link: string;
    drive_download_link: string;
  }>;
};

type Attachment = {
  id: string;
  filename: string;
  mime_type: string;
  file_size: number;
  drive_file_id: string;
  drive_web_view_link: string;
  drive_download_link: string;
};

interface TransactionDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
}

export function TransactionDetailDialog({
  open,
  onOpenChange,
  transaction,
}: TransactionDetailDialogProps) {
  const { format: formatCurrency } = useCurrency();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [viewingImage, setViewingImage] = useState<Attachment | null>(null);

  useEffect(() => {
    if (open && transaction?.id) {
      // Always reload attachments when dialog opens to ensure we have the latest data
      // This handles cases where attachments were updated via EditTransactionDialog
      loadAttachments();
    } else {
      setAttachments([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, transaction?.id]); // Note: loadAttachments is stable, so we don't need it in deps

  const loadAttachments = async () => {
    if (!transaction?.id) return;
    
    setLoadingAttachments(true);
    try {
      const data = await getTransactionAttachments(transaction.id);
      // Log attachment data for debugging
      console.log("Loaded attachments:", data);
      // Filter and map to ensure we have the correct structure
      const attachments = (data || []).filter((att: any) => 
        att && att.id && att.filename && att.drive_file_id
      ).map((att: any) => ({
        id: att.id,
        filename: att.filename,
        mime_type: att.mime_type,
        file_size: att.file_size,
        drive_file_id: att.drive_file_id,
        drive_web_view_link: att.drive_web_view_link,
        drive_download_link: att.drive_download_link,
      }));
      setAttachments(attachments);
    } catch (error) {
      console.error("Failed to load attachments:", error);
    } finally {
      setLoadingAttachments(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const isImage = (mimeType: string) => {
    return mimeType.startsWith("image/");
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Date</div>
                <div className="font-medium">
                  {format(new Date(transaction.transaction_date), "MMM dd, yyyy")}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Type</div>
                <Badge
                  variant={
                    transaction.type === "income"
                      ? "default"
                      : transaction.type === "expense"
                      ? "destructive"
                      : "outline"
                  }
                >
                  {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                </Badge>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Description</div>
                <div className="font-medium">{transaction.description}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Amount</div>
                <div className="font-bold text-lg">
                  {formatCurrency(transaction.amount)}
                </div>
              </div>
              {transaction.payee_payer && (
                <div>
                  <div className="text-sm text-muted-foreground">
                    {transaction.type === "income" ? "Payee" : "Payer"}
                  </div>
                  <div className="font-medium">{transaction.payee_payer}</div>
                </div>
              )}
              {transaction.transaction_id && (
                <div>
                  <div className="text-sm text-muted-foreground">Reference</div>
                  <div className="font-mono text-sm">{transaction.transaction_id}</div>
                </div>
              )}
            </div>
          </Card>

          {/* Line Items (if exists) */}
          {transaction.transaction_line_items &&
            transaction.transaction_line_items.length > 0 && (
              <Card className="p-4">
                <h3 className="font-semibold mb-4">Line Items</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transaction.transaction_line_items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>
                          {item.expense_account?.name || item.income_account?.name || "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}

          {/* Transaction Lines (Double-Entry) */}
          {transaction.transaction_lines && transaction.transaction_lines.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Accounting Entries</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transaction.transaction_lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>
                        {line.account?.name || "Unknown Account"}
                      </TableCell>
                      <TableCell className="text-right">
                        {line.debit_amount
                          ? formatCurrency(line.debit_amount)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {line.credit_amount
                          ? formatCurrency(line.credit_amount)
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* Attachments */}
          {attachments.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Attachments</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="border rounded-lg p-3 space-y-2 hover:bg-muted/50 transition-colors"
                  >
                    {isImage(attachment.mime_type) ? (
                      <div 
                        className="relative aspect-video rounded overflow-hidden bg-muted cursor-pointer"
                        onClick={() => setViewingImage(attachment)}
                      >
                        {attachment.drive_file_id ? (
                          <img
                            src={getDriveThumbnailUrl(attachment.drive_file_id)}
                            alt={attachment.filename}
                            className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                            onError={(e) => {
                              console.error("Failed to load image preview for file:", attachment.drive_file_id, attachment.filename);
                              // Hide the broken image and show error state
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FileTextIcon className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="aspect-video rounded bg-muted flex items-center justify-center">
                        <FileTextIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="space-y-1">
                      <p className="text-xs font-medium truncate" title={attachment.filename}>
                        {attachment.filename}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(attachment.file_size)}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => {
                            if (isImage(attachment.mime_type)) {
                              setViewingImage(attachment);
                            } else {
                              window.open(attachment.drive_web_view_link, "_blank");
                            }
                          }}
                        >
                          <ExternalLinkIcon className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => window.open(attachment.drive_download_link, "_blank")}
                        >
                          Download
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </DialogContent>

      {/* Image View Dialog */}
      {viewingImage && (
        <Dialog open={!!viewingImage} onOpenChange={(open) => !open && setViewingImage(null)}>
          <DialogContent className="!max-w-[90vw] !max-h-[90vh] w-[90vw] h-[90vh] p-0 m-0 rounded-lg border bg-background shadow-lg [&>button]:hidden">
            <DialogTitle className="sr-only">{viewingImage.filename}</DialogTitle>
            {/* Top Bar - Google Drive style */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewingImage(null)}
                  className="p-1 hover:bg-muted rounded-full transition-colors"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
                <span className="text-sm font-medium truncate">{viewingImage.filename}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(viewingImage.drive_web_view_link, "_blank")}
                  className="h-8"
                >
                  <ExternalLinkIcon className="h-4 w-4 mr-2" />
                  Open in Drive
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(viewingImage.drive_download_link, "_blank")}
                  className="h-8"
                >
                  Download
                </Button>
              </div>
            </div>
            
            {/* Image Container */}
            <div className="flex-1 flex items-center justify-center bg-muted/30 overflow-hidden">
              {viewingImage.drive_file_id ? (
                <img
                  src={getDriveFullImageUrl(viewingImage.drive_file_id)}
                  alt={viewingImage.filename}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    console.error("Failed to load image:", viewingImage.drive_file_id);
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <FileTextIcon className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}

