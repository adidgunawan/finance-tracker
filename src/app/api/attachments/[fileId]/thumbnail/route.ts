import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDriveClientForUser, getUserDriveTokens } from "@/lib/google-drive-oauth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Next.js 15: params is always a Promise
    const resolvedParams = await params;
    const fileId = resolvedParams.fileId;
    if (!fileId) {
      return NextResponse.json({ error: "File ID required" }, { status: 400 });
    }

    // Check if user has Google Drive connected
    const tokens = await getUserDriveTokens(session.user.id);
    if (!tokens) {
      return NextResponse.json(
        { error: "Google Drive not connected" },
        { status: 403 }
      );
    }

    // Get Google Drive client
    const drive = await getDriveClientForUser(session.user.id);

    // Get file metadata including thumbnail
    const file = await drive.files.get({
      fileId: fileId,
      fields: "id, thumbnailLink, webContentLink, mimeType",
    });

    // Try to get thumbnail link first
    let imageUrl = file.data.thumbnailLink;
    
    // If no thumbnail, try webContentLink for images
    if (!imageUrl && file.data.webContentLink && file.data.mimeType?.startsWith("image/")) {
      imageUrl = file.data.webContentLink;
    }

    // If still no URL, use uc?export=view format as fallback
    if (!imageUrl) {
      return NextResponse.redirect(
        `https://drive.google.com/uc?export=view&id=${fileId}`
      );
    }

    // Fetch the image from Google Drive
    try {
      const imageResponse = await fetch(imageUrl, {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      });

      if (!imageResponse.ok) {
        // Fallback to uc?export=view format
        return NextResponse.redirect(
          `https://drive.google.com/uc?export=view&id=${fileId}`
        );
      }

      const imageBuffer = await imageResponse.arrayBuffer();
      const contentType = imageResponse.headers.get("content-type") || file.data.mimeType || "image/jpeg";

      // Return the image with proper headers
      return new NextResponse(imageBuffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=3600",
        },
      });
    } catch (fetchError) {
      console.error("Error fetching image:", fetchError);
      // Fallback to uc?export=view format
      return NextResponse.redirect(
        `https://drive.google.com/uc?export=view&id=${fileId}`
      );
    }
  } catch (error) {
    console.error("Error fetching thumbnail:", error);
    // Try to get fileId from params for fallback
    try {
      const resolvedParams = await params;
      const fileId = resolvedParams.fileId;
      if (fileId) {
        return NextResponse.redirect(
          `https://drive.google.com/uc?export=view&id=${fileId}`
        );
      }
    } catch {
      // Ignore errors getting fileId
    }
    return NextResponse.json({ error: "Failed to fetch thumbnail" }, { status: 500 });
  }
}

