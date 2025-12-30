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
  
  // Skip auth check for API routes (except we need to check server actions)
  const isApiRoute = request.nextUrl.pathname.startsWith("/api");
  const isServerAction = request.method === "POST" && request.nextUrl.pathname === "/";
  
  // For auth routes, just pass through without checking
  if (isAuthRoute) {
    const response = NextResponse.next();
    // Add pathname to headers so AuthGuard can check it
    response.headers.set("x-pathname", request.nextUrl.pathname);
    return response;
  }
  
  try {
    const sessionResponse = await betterFetch<Session>(
      "/api/auth/get-session",
      {
        baseURL: request.nextUrl.origin,
        headers: {
          //get the cookie from the request
          cookie: request.headers.get("cookie") || "",
        },
      },
    );

    const session = sessionResponse.data;

    // If no session and not on auth route, redirect to login IMMEDIATELY
    // This must happen before any page rendering
    if (!session) {
      const redirectResponse = NextResponse.redirect(new URL("/login", request.url));
      // Add cache headers to prevent any caching of the redirect
      redirectResponse.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      redirectResponse.headers.set("Pragma", "no-cache");
      redirectResponse.headers.set("Expires", "0");
      return redirectResponse;
    }

    // If there's a session, check if user is authorized
    // The session from betterFetch might have a different structure
    const sessionWithUser = session as any;
    
    if (sessionWithUser && sessionWithUser.user) {
      // Get email from session - try multiple possible locations
      let userEmail = sessionWithUser.user?.email;
      
      // If email not in session, try to fetch from our API endpoint
      if (!userEmail && sessionWithUser.user?.id) {
        const cookie = request.headers.get("cookie") || "";
        userEmail = await getUserEmailFromAPI(sessionWithUser.user.id, request.nextUrl.origin, cookie);
      }
      
      // If we still don't have an email, deny access (fail-secure)
      if (!userEmail) {
        console.log(`[Middleware] No email found for user ${sessionWithUser.user?.id}, denying access`);
        const response = NextResponse.redirect(new URL("/login?unauthorized=true", request.url));
        response.cookies.set("better-auth.session_token", "", { maxAge: 0, path: "/" });
        response.cookies.set("better-auth.session", "", { maxAge: 0, path: "/" });
        return response;
      }
      
      // Check if user's email is in the allowed list
      const isAllowed = isEmailAllowed(userEmail);
      if (!isAllowed) {
        console.log(`[Middleware] User ${userEmail} is not in allowed list, denying access`);
        // User is not authorized - redirect to login and clear session
        const redirectResponse = NextResponse.redirect(new URL("/login?unauthorized=true", request.url));
        // Clear better-auth session cookies
        redirectResponse.cookies.set("better-auth.session_token", "", { maxAge: 0, path: "/" });
        redirectResponse.cookies.set("better-auth.session", "", { maxAge: 0, path: "/" });
        return redirectResponse;
      }
      
      console.log(`[Middleware] User ${userEmail} is authorized`);
      
      // If session exists and user is authorized, allow request through
      // Pass email through headers to AuthGuard to avoid redundant DB query
      const response = NextResponse.next();
      response.headers.set("x-pathname", request.nextUrl.pathname);
      response.headers.set("x-user-email", userEmail); // Pass email to AuthGuard
      return response;
    }
    
    // If we reach here, session exists but no user email was found
    // This shouldn't happen, but handle it safely
    const response = NextResponse.next();
    response.headers.set("x-pathname", request.nextUrl.pathname);
    return response;
  } catch (error) {
    // If session fetch fails, redirect to login for safety
    console.error("Middleware session check error:", error);
    if (!isAuthRoute) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth/check-user (our custom endpoint to get user email)
     * - api/auth/check-authorization (our custom endpoint to check authorization)
     * - api (other API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/auth/check-user|api/auth/check-authorization|api|_next/static|_next/image|favicon.ico).*)",
  ],
};
