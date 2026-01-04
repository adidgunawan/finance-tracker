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
import { toast } from "sonner";

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
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturate, setSaturate] = useState(100);
  const [grayscale, setGrayscale] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageCacheBuster, setImageCacheBuster] = useState<number>(Date.now());
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versions, setVersions] = useState<Array<{ id: string; modifiedTime: string; size: string }>>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

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

  // Reset rotation and filters when viewing a new image
  useEffect(() => {
    if (viewingImage) {
      setRotation(0);
      setBrightness(100);
      setContrast(100);
      setSaturate(100);
      setGrayscale(0);
      setShowFilters(false);
    }
  }, [viewingImage]);

  const resetFilters = () => {
    setRotation(0);
    setBrightness(100);
    setContrast(100);
    setSaturate(100);
    setGrayscale(0);
  };

  const handleSaveImage = async () => {
    if (!viewingImage?.drive_file_id) return;
    
    setSaving(true);
    try {
      // Get the specific high-res image element from the editor
      const mobileImg = document.getElementById('image-editor-target-mobile') as HTMLImageElement;
      const desktopImg = document.getElementById('image-editor-target-desktop') as HTMLImageElement;
      
      // Prioritize the one that is visible (offsetParent is not null)
      let img = (mobileImg?.offsetParent ? mobileImg : desktopImg) || mobileImg;
      
      if (!img) throw new Error("Image not found");

      // Verify we have dimensions
      if (img.naturalWidth === 0 || img.naturalHeight === 0) {
        throw new Error("Image not fully loaded");
      }

      // Create canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { alpha: true }); // Enable alpha for transparency
      if (!ctx) throw new Error("Could not get canvas context");

      // Set high quality smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Handle rotation - swap dimensions if rotated 90 or 270 degrees
      const isRotated = rotation === 90 || rotation === 270;
      canvas.width = isRotated ? img.naturalHeight : img.naturalWidth;
      canvas.height = isRotated ? img.naturalWidth : img.naturalHeight;

      // Apply transformations
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) grayscale(${grayscale}%)`;
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

      // Determine output format based on filename to preserve quality
      const isPng = viewingImage.filename.toLowerCase().endsWith('.png');
      const mimeType = isPng ? 'image/png' : 'image/jpeg';
      // Use maximum quality (1.0) for JPEGs, PNGs are lossless by default
      const quality = 1.0;

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to create blob"));
        }, mimeType, quality);
      });

      // Upload to server
      const formData = new FormData();
      formData.append('file', blob, viewingImage.filename);
      formData.append('driveFileId', viewingImage.drive_file_id);

      const response = await fetch('/api/transactions/update-attachment', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to update attachment");

      toast.success("Image updated successfully");
      
      // Close the viewer and reload attachments
      setViewingImage(null);
      
      // Update cache buster to force image refresh
      setImageCacheBuster(Date.now());
      
      // Wait a bit for Google Drive to process the update, then reload
      setTimeout(async () => {
        await loadAttachments();
      }, 1000);
    } catch (error) {
      console.error("Failed to save image:", error);
      toast.error("Failed to save image");
    } finally {
      setSaving(false);
    }
  };

  const loadVersionHistory = async () => {
    if (!viewingImage?.drive_file_id) return;

    setLoadingVersions(true);
    try {
      const response = await fetch(`/api/attachments/${viewingImage.drive_file_id}/versions`);
      if (!response.ok) throw new Error("Failed to load versions");
      
      const data = await response.json();
      // Reverse to show newest first
      setVersions((data.versions || []).reverse());
      setShowVersionHistory(true);
    } catch (error) {
      console.error("Failed to load version history:", error);
      toast.error("Failed to load version history");
    } finally {
      setLoadingVersions(false);
    }
  };

  const restoreVersion = async (revisionId: string) => {
    if (!viewingImage?.drive_file_id) return;

    try {
      const response = await fetch(`/api/attachments/${viewingImage.drive_file_id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revisionId }),
      });

      if (!response.ok) throw new Error("Failed to restore version");

      toast.success("Version restored successfully");
      setShowVersionHistory(false);
      setViewingImage(null);
      setImageCacheBuster(Date.now());
      
      setTimeout(async () => {
        await loadAttachments();
      }, 1000);
    } catch (error) {
      console.error("Failed to restore version:", error);
      toast.error("Failed to restore version");
    }
  };


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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div className="font-medium break-words">{transaction.description}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Amount</div>
                <div className="font-bold text-lg">
                  {formatCurrency(transaction.amount, { 
                    currency: transaction.currency || "USD"
                  })}
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
                          {formatCurrency(item.amount, { currency: transaction.currency || "USD" })}
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
                          ? formatCurrency(line.debit_amount, { currency: transaction.currency || "USD" })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {line.credit_amount
                          ? formatCurrency(line.credit_amount, { currency: transaction.currency || "USD" })
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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                            src={getDriveThumbnailUrl(attachment.drive_file_id, imageCacheBuster)}
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
                          className="text-xs h-7 hidden md:inline-flex"
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
          {/* Main Image View Dialog - Google Drive Style (Full Screen) */}
        <DialogContent className="!max-w-[100vw] !max-h-[100vh] w-screen h-screen p-0 m-0 rounded-none border-0 bg-black/95 backdrop-blur-sm z-[300] [&>button]:hidden flex flex-col overflow-hidden focus:outline-none">
          <DialogTitle className="sr-only">{viewingImage.filename}</DialogTitle>
          
          <div className="relative w-full h-full flex flex-col bg-black/50">
            {/* Close button for mobile/desktop (absolute top-right or handled in layout) */}
            
            {/* Mobile Layout - Flex Column */}
            <div className="md:hidden h-full flex flex-col">
              {/* Top Bar */}
              <div className="shrink-0 bg-gradient-to-b from-black/90 to-transparent safe-top">
                <div className="flex items-center justify-between px-3 py-3">
                  <button
                    onClick={() => setViewingImage(null)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    aria-label="Close"
                  >
                    <X className="h-6 w-6 text-white" />
                  </button>
                  
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`p-2 rounded-full transition-colors ${showFilters ? 'bg-white/30' : 'bg-white/10'}`}
                    title="Edit"
                  >
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Image Container - Grows to fill available space */}
              <div className="flex-1 flex items-center justify-center bg-black overflow-hidden min-h-0">
                {viewingImage.drive_file_id ? (
                  <>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white"></div>
                    </div>
                    
                    <img
                      id="image-editor-target-mobile"
                      src={getDriveFullImageUrl(viewingImage.drive_file_id, imageCacheBuster)}
                      alt={viewingImage.filename}
                      className="max-w-full max-h-full object-contain animate-in fade-in zoom-in-95 duration-300 transition-all"
                      style={{ 
                        transform: `rotate(${rotation}deg)`,
                        filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) grayscale(${grayscale}%)`
                      }}
                      onLoad={(e) => {
                        const spinner = document.querySelector('.animate-spin');
                        if (spinner) spinner.classList.add('hidden');
                      }}
                      onError={(e) => {
                        console.error("Failed to load image:", viewingImage.drive_file_id);
                        e.currentTarget.style.display = "none";
                        const spinner = document.querySelector('.animate-spin');
                        if (spinner) spinner.classList.add('hidden');
                      }}
                    />
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-4 text-white/60">
                    <FileTextIcon className="h-16 w-16" />
                    <p className="text-sm">Preview not available</p>
                  </div>
                )}
              </div>

              {/* Bottom Panel - Slides in/out by changing height */}
              <div className={`shrink-0 bg-black/95 backdrop-blur-xl border-t border-white/10 transition-all duration-300 ${showFilters ? 'max-h-[400px]' : 'max-h-0 border-t-0'} overflow-hidden`}>
                {/* Filter Controls */}
                <div className="px-4 pt-4 pb-3 space-y-4">
                  {/* Brightness */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-white">Brightness</label>
                      <span className="text-sm text-white/60">{brightness}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={brightness}
                      onChange={(e) => setBrightness(Number(e.target.value))}
                      className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                      style={{
                        background: `linear-gradient(to right, white ${(brightness / 200) * 100}%, rgba(255,255,255,0.2) ${(brightness / 200) * 100}%)`
                      }}
                    />
                  </div>

                  {/* Contrast */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-white">Contrast</label>
                      <span className="text-sm text-white/60">{contrast}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={contrast}
                      onChange={(e) => setContrast(Number(e.target.value))}
                      className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                      style={{
                        background: `linear-gradient(to right, white ${(contrast / 200) * 100}%, rgba(255,255,255,0.2) ${(contrast / 200) * 100}%)`
                      }}
                    />
                  </div>

                  {/* Saturation */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-white">Saturation</label>
                      <span className="text-sm text-white/60">{saturate}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={saturate}
                      onChange={(e) => setSaturate(Number(e.target.value))}
                      className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                      style={{
                        background: `linear-gradient(to right, white ${(saturate / 200) * 100}%, rgba(255,255,255,0.2) ${(saturate / 200) * 100}%)`
                      }}
                    />
                  </div>

                  {/* Black & White */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-white">Black & White</label>
                      <span className="text-sm text-white/60">{grayscale}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={grayscale}
                      onChange={(e) => setGrayscale(Number(e.target.value))}
                      className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                      style={{
                        background: `linear-gradient(to right, white ${grayscale}%, rgba(255,255,255,0.2) ${grayscale}%)`
                      }}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 px-4 py-3 border-t border-white/10 pb-safe">
                  <button
                    onClick={() => setRotation((prev) => (prev + 90) % 360)}
                    className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="text-sm font-medium text-white">Rotate</span>
                  </button>
                  
                  <button
                    onClick={loadVersionHistory}
                    disabled={loadingVersions}
                    className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <span className="text-sm font-medium text-white">{loadingVersions ? "Loading..." : "History"}</span>
                  </button>
                  
                  <button
                    onClick={resetFilters}
                    className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <span className="text-sm font-medium text-white">Reset</span>
                  </button>
                  
                  <button
                    onClick={handleSaveImage}
                    disabled={saving}
                    className="flex-1 py-3 bg-white hover:bg-white/90 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <span className="text-sm font-semibold text-black">{saving ? "Saving..." : "Save"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Desktop Layout - Flex Column */}
            <div className="hidden md:flex flex-col h-full bg-black">
              {/* Top Bar */}
              <div className="shrink-0 z-20 bg-gradient-to-b from-black/90 to-transparent">
                <div className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => setViewingImage(null)}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors shrink-0"
                      aria-label="Close"
                    >
                      <X className="h-6 w-6 text-white" />
                    </button>
                    <span className="text-base font-medium text-white truncate">
                      {viewingImage.filename}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setRotation((prev) => (prev + 90) % 360)}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors"
                      title="Rotate"
                    >
                      <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                    
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={`p-2 hover:bg-white/10 rounded-full transition-colors ${showFilters ? 'bg-white/20' : ''}`}
                      title="Filters"
                    >
                      <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                    </button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetFilters}
                      className="h-9 text-white hover:bg-white/10 hover:text-white"
                    >
                      Reset
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSaveImage}
                      disabled={saving}
                      className="h-9 text-white hover:bg-white/10 hover:text-white"
                    >
                      {saving ? "Saving..." : "Save"}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(viewingImage.drive_download_link, "_blank")}
                      className="h-9 text-white hover:bg-white/10 hover:text-white"
                    >
                      Download
                    </Button>
                  </div>
                </div>

                {/* Desktop Filters Panel */}
                {showFilters && (
                  <div className="px-6 pb-4 space-y-3 animate-in slide-in-from-top duration-200">
                    <div className="bg-black/60 backdrop-blur-md rounded-lg p-4 space-y-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-white/80">
                          <label>Brightness</label>
                          <span>{brightness}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="200"
                          value={brightness}
                          onChange={(e) => setBrightness(Number(e.target.value))}
                          className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-white/80">
                          <label>Contrast</label>
                          <span>{contrast}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="200"
                          value={contrast}
                          onChange={(e) => setContrast(Number(e.target.value))}
                          className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-white/80">
                          <label>Saturation</label>
                          <span>{saturate}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="200"
                          value={saturate}
                          onChange={(e) => setSaturate(Number(e.target.value))}
                          className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-white/80">
                          <label>Black & White</label>
                          <span>{grayscale}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={grayscale}
                          onChange={(e) => setGrayscale(Number(e.target.value))}
                          className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Desktop Image Container */}
              <div className="flex-1 w-full min-h-0 flex items-center justify-center bg-black overflow-hidden p-4">
                {viewingImage.drive_file_id ? (
                  <>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white"></div>
                    </div>
                    
                    <img
                      id="image-editor-target-desktop"
                      src={getDriveFullImageUrl(viewingImage.drive_file_id, imageCacheBuster)}
                      alt={viewingImage.filename}
                      className="relative z-10 max-w-full max-h-full object-contain animate-in fade-in zoom-in-95 duration-300 transition-all"
                      style={{ 
                        transform: `rotate(${rotation}deg)`,
                        filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) grayscale(${grayscale}%)`
                      }}
                      onLoad={(e) => {
                        const spinner = e.currentTarget.parentElement?.querySelector('.animate-spin');
                        if (spinner) spinner.classList.add('hidden');
                      }}
                      onError={(e) => {
                        console.error("Failed to load image:", viewingImage.drive_file_id);
                        e.currentTarget.style.display = "none";
                        const spinner = e.currentTarget.parentElement?.querySelector('.animate-spin');
                        if (spinner) {
                          spinner.classList.add('hidden');
                          const errorDiv = document.createElement('div');
                          errorDiv.className = 'text-white text-center';
                          errorDiv.innerHTML = '<p class="text-lg mb-2">Failed to load image</p><p class="text-sm text-white/60">The image may have been moved or deleted</p>';
                          e.currentTarget.parentElement?.appendChild(errorDiv);
                        }
                      }}
                    />
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-4 text-white/60">
                    <FileTextIcon className="h-16 w-16" />
                    <p className="text-sm">Preview not available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
        </Dialog>
      )}

      {/* Version History Dialog */}
      <Dialog open={showVersionHistory} onOpenChange={setShowVersionHistory}>
        <DialogContent className="max-w-md z-[400]">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {versions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No version history available</p>
            ) : (
              versions.map((version, index) => (
                <div
                  key={version.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => restoreVersion(version.id)}
                >
                  <div>
                    <p className="text-sm font-medium">
                      {index === 0 
                        ? "Current Version" 
                        : (index === versions.length - 1 
                          ? "Original Version" 
                          : `Version ${versions.length - index}`)
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(version.modifiedTime).toLocaleString()}
                    </p>
                  </div>
                  {index !== 0 && (
                    <Button variant="outline" size="sm" onClick={(e) => {
                      e.stopPropagation();
                      restoreVersion(version.id);
                    }}>
                      Restore
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
