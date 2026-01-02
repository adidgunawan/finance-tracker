import { NextRequest, NextResponse } from "next/server";
import { convertCurrency } from "@/lib/services/exchange-rate";

/**
 * POST /api/currency/convert
 * Convert amount between currencies using exchange rates
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, fromCurrency, toCurrency } = body;

    // Validation - allow negative amounts for liabilities
    if (typeof amount !== "number" || isNaN(amount)) {
      return NextResponse.json(
        { error: "Invalid amount - must be a number" },
        { status: 400 }
      );
    }

    if (!fromCurrency || !toCurrency) {
      return NextResponse.json(
        { error: "Missing currency codes" },
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

    return NextResponse.json({
      originalAmount: amount,
      originalCurrency: result.originalCurrency,
      convertedAmount: finalAmount,
      convertedCurrency: result.convertedCurrency,
      exchangeRate: result.exchangeRate,
      rateTimestamp: result.rateTimestamp.toISOString(),
    });
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
