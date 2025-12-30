import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest, NextResponse } from "next/server";

let handler: ReturnType<typeof toNextJsHandler>;

try {
  handler = toNextJsHandler(auth);
} catch (error: any) {
  console.error("Failed to initialize auth handler:", error);
  throw error;
}

export async function GET(req: NextRequest) {
  try {
    return await handler.GET(req);
  } catch (error: any) {
    console.error("Auth GET Error:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      cause: error.cause,
    });
    return NextResponse.json(
      { 
        error: error.message || "Authentication error", 
        details: process.env.NODE_ENV === "development" ? error.stack : undefined 
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    console.log("Auth POST request to:", url.pathname);
    const response = await handler.POST(req);
    return response;
  } catch (error: any) {
    console.error("Auth POST Error:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      cause: error.cause,
      name: error.name,
    });
    
    // Handle authorization errors specifically
    if (error.message === "EMAIL_NOT_AUTHORIZED") {
      return NextResponse.json(
        { 
          error: "EMAIL_NOT_AUTHORIZED",
          message: "Your email is not authorized to access this application. Please contact the administrator.",
        },
        { status: 403 }
      );
    }
    
    // Return error response that client can read
    return NextResponse.json(
      { 
        error: error.message || "Authentication error",
        type: error.name || "Error",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
