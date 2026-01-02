"use client";

import { useState, useEffect, useCallback } from "react";
import { getSettings } from "@/actions/settings";
import { formatCurrency } from "@/lib/currency";
import type { ConversionResult } from "@/lib/services/exchange-rate";

/**
 * React hook for currency conversion in UI components
 * Provides conversion functions and base currency info
 */
export function useCurrencyConversion() {
  const [baseCurrency, setBaseCurrency] = useState<string>("IDR");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBaseCurrency();
  }, []);

  const loadBaseCurrency = async () => {
    try {
      const settings = await getSettings();
      if (settings?.default_currency) {
        setBaseCurrency(settings.default_currency);
      }
    } catch (err) {
      console.error("Failed to load base currency:", err);
      setError(err instanceof Error ? err.message : "Failed to load currency");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Convert amount from one currency to another
   */
  const convert = useCallback(
    async (
      amount: number,
      fromCurrency: string,
      toCurrency: string
    ): Promise<ConversionResult> => {
      try {
        // Call server-side API endpoint for conversion
        const response = await fetch("/api/currency/convert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount,
            fromCurrency,
            toCurrency,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          const errorMessage = errorData.error || "Conversion failed";
          
          // Warn instead of error for unsupported currency pairs
          if (errorMessage.includes("Unsupported currency pair")) {
            console.warn(`Currency conversion: ${errorMessage}`);
          }
          throw new Error(errorMessage);
        }

        const result = await response.json();
        return {
          ...result,
          rateTimestamp: new Date(result.rateTimestamp),
        };
      } catch (err) {
        console.error("Currency conversion error:", err);
        throw err;
      }
    },
    []
  );

  /**
   * Convert amount to user's base currency
   */
  const convertToBase = useCallback(
    async (amount: number, fromCurrency: string): Promise<ConversionResult> => {
      return convert(amount, fromCurrency, baseCurrency);
    },
    [convert, baseCurrency]
  );

  /**
   * Format a converted amount with both original and converted values
   */
  const formatConverted = useCallback(
    (converted: ConversionResult, options?: { showBoth?: boolean }): string => {
      const { showBoth = false } = options || {};

      if (showBoth && converted.originalCurrency !== converted.convertedCurrency) {
        return `${formatCurrency(converted.originalAmount, converted.originalCurrency)} ≈ ${formatCurrency(converted.convertedAmount, converted.convertedCurrency)}`;
      }

      return formatCurrency(converted.convertedAmount, converted.convertedCurrency);
    },
    []
  );

  return {
    convert,
    convertToBase,
    formatConverted,
    baseCurrency,
    loading,
    error,
    refreshBaseCurrency: loadBaseCurrency,
  };
}
