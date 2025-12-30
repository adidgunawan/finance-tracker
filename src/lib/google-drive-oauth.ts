import { google } from "googleapis";
import { createAdminClient } from "@/lib/supabase/admin";

export interface GoogleDriveTokens {
  access_token: string;
  refresh_token: string;
  expires_at: Date;
}

/**
 * Get OAuth2 client for Google Drive
 */
export function getOAuth2Client() {
  // Support both naming conventions: GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET (existing)
  // and GOOGLE_DRIVE_CLIENT_ID/GOOGLE_DRIVE_CLIENT_SECRET (new)
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI || 
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Google OAuth credentials must be set. Use either:\n" +
      "- GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or\n" +
      "- GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET"
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Get OAuth authorization URL
 */
export function getAuthorizationUrl(state?: string): string {
  const oauth2Client = getOAuth2Client();
  
  const scopes = [
    "https://www.googleapis.com/auth/drive.file", // Access to files created by the app
  ];

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent", // Force consent to get refresh token
    state: state,
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<GoogleDriveTokens> {
  const oauth2Client = getOAuth2Client();
  
  const { tokens } = await oauth2Client.getToken(code);
  
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("Failed to get tokens from Google");
  }

  const expiresAt = tokens.expiry_date 
    ? new Date(tokens.expiry_date)
    : new Date(Date.now() + 3600 * 1000); // Default to 1 hour if not provided

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt,
  };
}

/**
 * Get user's stored Google Drive tokens
 */
export async function getUserDriveTokens(userId: string): Promise<GoogleDriveTokens | null> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from("google_drive_tokens")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: new Date(data.expires_at),
  };
}

/**
 * Store user's Google Drive tokens
 */
export async function storeUserTokens(
  userId: string,
  tokens: GoogleDriveTokens
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("google_drive_tokens")
    .upsert({
      user_id: userId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at.toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "user_id",
    });

  if (error) {
    throw new Error(`Failed to store tokens: ${error.message}`);
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{ access_token: string; expires_at: Date }> {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  const { credentials } = await oauth2Client.refreshAccessToken();

  if (!credentials.access_token) {
    throw new Error("Failed to refresh access token");
  }

  const expiresAt = credentials.expiry_date
    ? new Date(credentials.expiry_date)
    : new Date(Date.now() + 3600 * 1000);

  return {
    access_token: credentials.access_token,
    expires_at: expiresAt,
  };
}

/**
 * Get valid access token for user (refresh if needed)
 */
export async function getValidAccessToken(userId: string): Promise<string> {
  let tokens = await getUserDriveTokens(userId);

  if (!tokens) {
    throw new Error("Google Drive not connected. Please connect your Google Drive account.");
  }

  // Check if token is expired or will expire in the next 5 minutes
  const now = new Date();
  const expiresAt = new Date(tokens.expires_at);
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  if (expiresAt <= fiveMinutesFromNow) {
    // Token is expired or about to expire, refresh it
    try {
      const refreshed = await refreshAccessToken(tokens.refresh_token);
      
      // Update stored tokens
      tokens = {
        ...tokens,
        access_token: refreshed.access_token,
        expires_at: refreshed.expires_at,
      };
      
      await storeUserTokens(userId, tokens);
    } catch (error: any) {
      throw new Error(`Failed to refresh access token: ${error.message}. Please reconnect your Google Drive account.`);
    }
  }

  return tokens.access_token;
}

/**
 * Revoke tokens and disconnect Google Drive
 */
export async function revokeTokens(userId: string): Promise<void> {
  const tokens = await getUserDriveTokens(userId);
  
  if (tokens) {
    try {
      const oauth2Client = getOAuth2Client();
      oauth2Client.setCredentials({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      });
      await oauth2Client.revokeCredentials();
    } catch (error) {
      // Continue even if revocation fails
      console.error("Failed to revoke tokens:", error);
    }
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("google_drive_tokens")
    .delete()
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to delete tokens: ${error.message}`);
  }
}

/**
 * Get Google Drive client for a specific user
 */
export async function getDriveClientForUser(userId: string) {
  const accessToken = await getValidAccessToken(userId);
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken,
  });

  return google.drive({ version: "v3", auth: oauth2Client });
}

