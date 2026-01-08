import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { isEmailAllowed } from "@/lib/auth-utils";
import { Pool } from "pg";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ authorized: false, reason: "no_session" }, { status: 401 });
    }

    // Get user email from session or database
    let userEmail = (session.user as any)?.email;

    // If email not in session, query database
    if (!userEmail && session.user?.id) {
      const dbPool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });

      const result = await dbPool.query(
        'SELECT email FROM "user" WHERE id = $1',
        [session.user.id]
      );

      await dbPool.end();

      if (result.rows.length > 0) {
        userEmail = result.rows[0].email;
      }
    }

    if (!userEmail) {
      return NextResponse.json({ authorized: false, reason: "no_email" }, { status: 403 });
    }

    // Check if email is allowed
    if (!isEmailAllowed(userEmail)) {
      return NextResponse.json({ authorized: false, reason: "not_whitelisted", email: userEmail }, { status: 403 });
    }

    return NextResponse.json({ authorized: true, email: userEmail });
  } catch (error) {
    console.error("Authorization check error:", error);
    return NextResponse.json({ authorized: false, reason: "error" }, { status: 500 });
  }
}






