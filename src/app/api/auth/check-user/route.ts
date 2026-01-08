import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Pool } from "pg";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ email: null }, { status: 401 });
    }

    // Query user table directly to get email
    const dbPool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    const result = await dbPool.query(
      'SELECT email FROM "user" WHERE id = $1',
      [session.user.id]
    );

    await dbPool.end();

    if (result.rows.length === 0) {
      return NextResponse.json({ email: null }, { status: 404 });
    }

    return NextResponse.json({ email: result.rows[0].email });
  } catch (error) {
    console.error("Error fetching user email:", error);
    return NextResponse.json({ email: null }, { status: 500 });
  }
}






