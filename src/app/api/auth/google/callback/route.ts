import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, storeUserTokens } from "@/lib/google-drive-oauth";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(request: NextRequest) {
  // Get base URL once at the start
  const baseUrl = new URL(request.url).origin;

  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle OAuth errors
    if (error) {
      return NextResponse.redirect(
        `${baseUrl}/settings?error=${encodeURIComponent(error)}`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${baseUrl}/settings?error=no_code`
      );
    }

    // Verify state contains user ID
    let userId: string;
    try {
      if (!state) {
        throw new Error("No state parameter");
      }
      const stateData = JSON.parse(Buffer.from(state, "base64").toString());
      userId = stateData.userId;
    } catch (error) {
      return NextResponse.redirect(
        `${baseUrl}/settings?error=invalid_state`
      );
    }

    // Verify session matches state
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || session.user.id !== userId) {
      return NextResponse.redirect(
        `${baseUrl}/settings?error=unauthorized`
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Store tokens
    await storeUserTokens(userId, tokens);
    
    // Redirect back to settings with success message
    return NextResponse.redirect(
      `${baseUrl}/settings?success=google_drive_connected`
    );
  } catch (error) {
    console.error("Error in Google OAuth callback:", error);
    return NextResponse.redirect(
      `${baseUrl}/settings?error=${encodeURIComponent(
        error instanceof Error ? error.message : "oauth_error"
      )}`
    );
  }
}

