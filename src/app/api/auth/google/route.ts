import { NextRequest, NextResponse } from "next/server";
import { getAuthorizationUrl } from "@/lib/google-drive-oauth";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    // Get current session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate state parameter with user ID for security
    const state = Buffer.from(JSON.stringify({ userId: session.user.id })).toString("base64");

    // Get authorization URL
    const authUrl = getAuthorizationUrl(state);

    // Redirect to Google OAuth
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Error initiating Google OAuth:", error);
    return NextResponse.json(
      { error: "Failed to initiate Google OAuth" },
      { status: 500 }
    );
  }
}

