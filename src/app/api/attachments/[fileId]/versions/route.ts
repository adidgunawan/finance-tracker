import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getFileVersions, restoreFileVersion } from "@/lib/google-drive";

// GET - List file versions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileId } = await params;
    const versions = await getFileVersions(fileId, session.user.id);

    return NextResponse.json({ versions });
  } catch (error) {
    console.error("Error getting file versions:", error);
    return NextResponse.json(
      { error: "Failed to get file versions" },
      { status: 500 }
    );
  }
}

// POST - Restore a specific version
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileId } = await params;
    const { revisionId } = await request.json();

    if (!revisionId) {
      return NextResponse.json(
        { error: "Missing revisionId" },
        { status: 400 }
      );
    }

    await restoreFileVersion(fileId, revisionId, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error restoring file version:", error);
    return NextResponse.json(
      { error: "Failed to restore file version" },
      { status: 500 }
    );
  }
}
