"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { TrashIcon, UploadIcon, FileTextIcon, ExternalLinkIcon } from "@radix-ui/react-icons";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getUserDriveTokens } from "@/actions/google-drive";
import { useRouter } from "next/navigation";
import { getDriveThumbnailUrl } from "@/lib/utils/google-drive";

interface FileAttachment {
  id: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  driveFileId?: string;
  driveWebViewLink: string;
  driveDownloadLink: string;
  preview?: string; // For images
}

interface FileUploadProps {
  attachments?: FileAttachment[];
  onFilesChange: (attachments: FileAttachment[]) => void;
  maxFiles?: number;
  disabled?: boolean;
}

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
const ALLOWED_PDF_TYPE = "application/pdf";
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ALLOWED_PDF_TYPE];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export function FileUpload({
  attachments = [],
  onFilesChange,
  maxFiles = 10,
  disabled = false,
}: FileUploadProps) {
  const [uploading, setUploading] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [driveConnected, setDriveConnected] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkDriveConnection();
  }, []);

  const checkDriveConnection = async () => {
    try {
      const tokens = await getUserDriveTokens();
      setDriveConnected(!!tokens);
    } catch (error) {
      setDriveConnected(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const uploadFile = async (file: File): Promise<FileAttachment> => {
    // Check if Google Drive is connected
    if (driveConnected === false) {
      throw new Error("Google Drive not connected. Please connect your Google Drive account in Settings.");
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/transactions/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      const errorMessage = error.error || "Failed to upload file";
      
      // If error mentions Google Drive not connected, update state
      if (errorMessage.includes("Google Drive not connected") || errorMessage.includes("not connected")) {
        setDriveConnected(false);
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return {
      id: data.id,
      filename: data.filename,
      mimeType: data.mimeType,
      fileSize: data.fileSize,
      driveFileId: data.driveFileId,
      driveWebViewLink: data.driveWebViewLink,
      driveDownloadLink: data.driveDownloadLink,
      preview: ALLOWED_IMAGE_TYPES.includes(data.mimeType) && data.driveFileId
        ? getDriveThumbnailUrl(data.driveFileId)
        : undefined,
    };
  };

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      setError(null);

      // Check if adding these files would exceed max
      if (attachments.length + files.length > maxFiles) {
        setError(`Maximum ${maxFiles} files allowed`);
        return;
      }

      // Validate all files first
      const fileArray = Array.from(files);
      for (const file of fileArray) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          setError(
            `Invalid file type: ${file.name}. Allowed types: Images (JPG, PNG, GIF, WEBP) and PDF`
          );
          return;
        }
        if (file.size > MAX_FILE_SIZE) {
          setError(`File too large: ${file.name}. Maximum size is 25MB`);
          return;
        }
      }

      // Upload files one by one
      const newAttachments: FileAttachment[] = [];
      for (const file of fileArray) {
        try {
          setUploading((prev) => new Set(prev).add(file.name));
          const attachment = await uploadFile(file);
          newAttachments.push(attachment);
          setUploading((prev) => {
            const next = new Set(prev);
            next.delete(file.name);
            return next;
          });
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to upload file");
          setUploading((prev) => {
            const next = new Set(prev);
            next.delete(file.name);
            return next;
          });
          return;
        }
      }

      onFilesChange([...attachments, ...newAttachments]);
    },
    [attachments, maxFiles, onFilesChange]
  );

  const handleRemove = (id: string) => {
    onFilesChange(attachments.filter((att) => att.id !== id));
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      handleFileSelect(files);
    },
    [disabled, handleFileSelect]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Show connection prompt if not connected
  if (driveConnected === false) {
    return (
      <div className="space-y-4">
        <Card className="p-6 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-amber-900 dark:text-amber-100">
                Google Drive Not Connected
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Connect your Google Drive account to upload files for transactions.
              </p>
            </div>
            <Button
              onClick={() => router.push("/settings")}
              variant="default"
              className="bg-amber-600 hover:bg-amber-700"
            >
              <ExternalLinkIcon className="h-4 w-4 mr-2" />
              Go to Settings to Connect
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-6 transition-colors
          ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }
          ${disabled || driveConnected === null ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
        onClick={() => !disabled && driveConnected !== null && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_TYPES.join(",")}
          onChange={handleInputChange}
          disabled={disabled || uploading.size > 0}
          className="hidden"
        />
        <div className="flex flex-col items-center justify-center text-center space-y-2">
          <UploadIcon className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">
              {uploading.size > 0
                ? `Uploading ${uploading.size} file${uploading.size !== 1 ? "s" : ""}...`
                : "Click or drag files here"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Images (JPG, PNG, GIF, WEBP) or PDF up to 25MB
            </p>
            {attachments.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {attachments.length} file{attachments.length !== 1 ? "s" : ""} attached
              </p>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded p-2">
          {error}
        </div>
      )}

      {/* Show uploading files with loading indicators */}
      {uploading.size > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Uploading...</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from(uploading).map((filename) => (
              <Card key={filename} className="p-3 relative">
                <div className="relative aspect-video mb-2 rounded overflow-hidden bg-muted flex items-center justify-center">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="text-xs text-muted-foreground">Uploading...</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium truncate" title={filename}>
                    {filename}
                  </p>
                  <Skeleton className="h-3 w-16" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Attached Files:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {attachments.map((attachment) => (
              <Card key={attachment.id} className="p-3 relative group">
                {attachment.preview ? (
                  <div className="relative aspect-video mb-2 rounded overflow-hidden bg-muted">
                    <img
                      src={attachment.preview}
                      alt={attachment.filename}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-video mb-2 rounded bg-muted flex items-center justify-center">
                    <FileTextIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-xs font-medium truncate" title={attachment.filename}>
                    {attachment.filename}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.fileSize)}
                  </p>
                </div>
                {!disabled && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(attachment.id);
                    }}
                  >
                    <TrashIcon className="h-3 w-3" />
                  </Button>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

