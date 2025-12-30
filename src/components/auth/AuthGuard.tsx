import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { isEmailAllowed } from "@/lib/auth-utils";
import { Pool } from "pg";

export async function AuthGuard({ children }: { children: React.ReactNode }) {
  // AuthGuard should only be used in protected route groups
  // If it's being called for public routes, that's a configuration error
  // But we'll add a safety check anyway
  
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";
  
  // Safety check: if we're on a public route, just render (shouldn't happen with proper route groups)
  if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
    return <>{children}</>;
  }

  try {
    const session = await auth.api.getSession({
      headers: headersList,
    });

    // If no session, redirect to login
    if (!session?.user) {
      redirect("/login");
    }

    // Get user email from session or database
    let userEmail = (session.user as any)?.email;

    // If email not in session, query database
    if (!userEmail && session.user?.id) {
      const dbPool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });

      try {
        const result = await dbPool.query(
          'SELECT email FROM "user" WHERE id = $1',
          [session.user.id]
        );

        if (result.rows.length > 0) {
          userEmail = result.rows[0].email;
        }
      } finally {
        await dbPool.end();
      }
    }

    // If no email found, redirect to login
    if (!userEmail) {
      redirect("/login?unauthorized=true");
    }

    // Check if email is allowed
    if (!isEmailAllowed(userEmail)) {
      redirect("/login?unauthorized=true&reason=email_not_authorized");
    }

    // User is authorized, render children
    return <>{children}</>;
  } catch (error: any) {
    // NEXT_REDIRECT is expected - Next.js uses exceptions for redirects
    // Don't log it as an error
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      // Re-throw redirect errors so Next.js can handle them
      throw error;
    }
    
    // For actual errors, log and redirect
    console.error("AuthGuard error:", error);
    redirect("/login");
  }
}

