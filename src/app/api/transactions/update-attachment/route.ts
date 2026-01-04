import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { updateFile } from "@/lib/google-drive";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const driveFileId = formData.get("driveFileId") as string;

    if (!file || !driveFileId) {
      return NextResponse.json(
        { error: "Missing file or driveFileId" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Update file in Google Drive
    await updateFile(driveFileId, buffer, file.type, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating attachment:", error);
    return NextResponse.json(
      { error: "Failed to update attachment" },
      { status: 500 }
    );
  }
}
