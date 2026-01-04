import { NextRequest, NextResponse } from "next/server";
import { convertCurrency } from "@/lib/services/exchange-rate";

/**
 * GET /api/currency/convert?amount=100&from=USD&to=IDR
 * Convert amount between currencies using exchange rates
 * 
 * Uses GET instead of POST for:
 * - HTTP caching (CDN + browser)
 * - Request deduplication
 * - Better debugging
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const amountStr = searchParams.get("amount");
    const fromCurrency = searchParams.get("from");
    const toCurrency = searchParams.get("to");

    // Parse amount
    const amount = amountStr ? parseFloat(amountStr) : NaN;

    // Validation - allow negative amounts for liabilities
    if (typeof amount !== "number" || isNaN(amount)) {
      return NextResponse.json(
        { error: "Invalid amount - must be a number" },
        { status: 400 }
      );
    }

    if (!fromCurrency || !toCurrency) {
      return NextResponse.json(
        { error: "Missing currency codes (from/to required)" },
        { status: 400 }
      );
    }

    // Perform conversion
    // Handle negative amounts (for liabilities/credit cards)
    const isNegative = amount < 0;
    const absoluteAmount = Math.abs(amount);
    
    const result = await convertCurrency(absoluteAmount, fromCurrency, toCurrency);
    
    // Preserve the sign for negative amounts
    const finalAmount = isNegative ? -result.convertedAmount : result.convertedAmount;

    const response = NextResponse.json({
      originalAmount: amount,
      originalCurrency: result.originalCurrency,
      convertedAmount: finalAmount,
      convertedCurrency: result.convertedCurrency,
      exchangeRate: result.exchangeRate,
      rateTimestamp: result.rateTimestamp.toISOString(),
    });

    // Add caching headers
    // Cache for 1 hour, allow stale content for 24 hours while revalidating
    response.headers.set(
      "Cache-Control",
      "public, max-age=3600, stale-while-revalidate=86400"
    );

    return response;
  } catch (error) {
    // Don't log expected "unsupported currency" errors to reduce console noise
    if (!error || !(error instanceof Error) || !error.message.includes("Unsupported currency pair")) {
      console.error("Currency conversion error:", error);
    }
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to convert currency",
      },
      { status: 500 }
    );
  }
}

