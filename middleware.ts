import { betterFetch } from "@better-fetch/fetch";
import type { Session } from "better-auth/types";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Checks if an email is in the allowed list
 * Inlined here to avoid import issues in edge runtime
 */
function isEmailAllowed(email: string): boolean {
  if (!email || email.trim() === "") {
    return false;
  }
  
  const allowedEmailsEnv = process.env.ALLOWED_USER_EMAILS;
  
  if (!allowedEmailsEnv || allowedEmailsEnv.trim() === "") {
    // Fail-secure: if not configured, deny all
    return false;
  }
  
  // Parse comma-separated list, trim whitespace, convert to lowercase
  const allowedEmails = allowedEmailsEnv
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
  
  // Case-insensitive comparison
  return allowedEmails.includes(email.trim().toLowerCase());
}

/**
 * Fetches user email from our custom API endpoint
 * This queries the database directly to get the user's email
 */
async function getUserEmailFromAPI(userId: string, baseURL: string, cookie: string): Promise<string | null> {
  try {
    const response = await betterFetch<{ email: string | null }>(
      `/api/auth/check-user`,
      {
        baseURL,
        headers: { cookie },
      },
    );
    return response.data?.email || null;
  } catch (error) {
    console.error("Failed to fetch user email from API:", error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const isAuthRoute = request.nextUrl.pathname.startsWith("/login") || request.nextUrl.pathname.startsWith("/register");
  
  // CHECK: If this is an auth route
  if (isAuthRoute) {
    const response = NextResponse.next();
    response.headers.set("x-pathname", request.nextUrl.pathname);
    return response;
  }

  // OPTIMIZATION: Check for session cookie existence instead of full validation
  // We trust the cookie's presence for routing speed (fail-fast)
  // detailed validation happens in AuthGuard (client) or Server Actions (data access)
  const sessionToken = request.cookies.get("better-auth.session_token");

  if (!sessionToken) {
     const redirectResponse = NextResponse.redirect(new URL("/login", request.url));
     redirectResponse.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
     return redirectResponse;
  }

  // Allow request through if cookie exists
  const response = NextResponse.next();
  response.headers.set("x-pathname", request.nextUrl.pathname);
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth/* (all auth API routes)
     * - api (other API routes - they handle their own auth)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
