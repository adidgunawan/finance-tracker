import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadFile } from "@/lib/google-drive";
import { createAdminClient } from "@/lib/supabase/admin";

// Allowed file types
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];
const ALLOWED_PDF_TYPE = "application/pdf";
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ALLOWED_PDF_TYPE];

// Maximum file size: 25MB
const MAX_FILE_SIZE = 25 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    // Check authentication with timeout protection
    let session;
    try {
      // Use request headers directly instead of next/headers to avoid connection issues
      session = await Promise.race([
        auth.api.getSession({
          headers: request.headers,
        }),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error("Authentication timeout")), 10000)
        ),
      ]);
    } catch (authError: any) {
      console.error("Authentication error:", authError);
      
      // If it's a timeout, return a more helpful error
      if (authError.message?.includes("timeout") || authError.message?.includes("Connection")) {
        return NextResponse.json(
          {
            error: "Authentication service timeout. Please refresh the page and try again.",
          },
          { status: 503 }
        );
      }
      
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const transactionId = formData.get("transactionId") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Invalid file type. Allowed types: ${ALLOWED_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // If transactionId is provided, verify it belongs to the user
    if (transactionId) {
      const supabase = createAdminClient();
      const { data: transaction, error } = await supabase
        .from("transactions")
        .select("id, user_id")
        .eq("id", transactionId)
        .eq("user_id", session.user.id)
        .single();

      if (error || !transaction) {
        return NextResponse.json(
          { error: "Transaction not found or access denied" },
          { status: 404 }
        );
      }
    }

    // Upload to Google Drive
    // If transactionId is not provided, use a temporary ID (will be updated later)
    const tempTransactionId = transactionId || `temp-${Date.now()}`;
    const driveMetadata = await uploadFile(
      file,
      session.user.id,
      tempTransactionId,
      file.name,
      file.type
    );

    // Store metadata in database
    const supabase = createAdminClient();
    const { data: attachment, error: dbError } = await supabase
      .from("transaction_attachments")
      .insert({
        transaction_id: transactionId || null, // Will be updated when transaction is created
        filename: file.name,
        mime_type: file.type,
        file_size: file.size,
        drive_file_id: driveMetadata.driveFileId,
        drive_web_view_link: driveMetadata.driveWebViewLink,
        drive_download_link: driveMetadata.driveDownloadLink,
      })
      .select()
      .single();

    if (dbError) {
      // Clean up Google Drive file if database insert fails
      try {
        const { deleteFile } = await import("@/lib/google-drive");
        await deleteFile(driveMetadata.driveFileId);
      } catch (cleanupError) {
        console.error("Failed to cleanup Google Drive file:", cleanupError);
      }

      return NextResponse.json(
        { error: "Failed to save file metadata", details: dbError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: attachment.id,
      filename: attachment.filename,
      mimeType: attachment.mime_type,
      fileSize: attachment.file_size,
      driveFileId: attachment.drive_file_id,
      driveWebViewLink: attachment.drive_web_view_link,
      driveDownloadLink: attachment.drive_download_link,
    });
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      {
        error: "Failed to upload file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

