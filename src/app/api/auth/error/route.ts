import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const error = searchParams.get("error");
  
  // If it's an authorization error, redirect to login with unauthorized flag
  if (error === "unable_to_create_user" || error === "EMAIL_NOT_AUTHORIZED") {
    return NextResponse.redirect(
      new URL("/login?unauthorized=true&reason=email_not_authorized", request.url)
    );
  }
  
  // For other errors, also redirect to login with error info
  return NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent(error || "unknown")}`, request.url)
  );
}




