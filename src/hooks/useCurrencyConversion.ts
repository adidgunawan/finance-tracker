"use client";

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSettings } from "@/actions/settings";
import { formatCurrency } from "@/lib/currency";
import type { ConversionResult } from "@/lib/services/exchange-rate";

/**
 * React hook for currency conversion in UI components
 * Provides conversion functions and base currency info
 * Uses TanStack Query for caching and deduplication
 */
export function useCurrencyConversion() {
  // Fetch base currency from settings
  const {
    data: baseCurrency = "IDR",
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ["settings", "currency"],
    queryFn: async () => {
      const settings = await getSettings();
      return settings?.default_currency || "IDR";
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  const error = queryError instanceof Error ? queryError.message : null;

  /**
   * Convert amount from one currency to another
   * Results are automatically cached and deduplicated by TanStack Query
   */
  const convert = useCallback(
    async (
      amount: number,
      fromCurrency: string,
      toCurrency: string
    ): Promise<ConversionResult> => {
      try {
        // Build GET request URL
        const params = new URLSearchParams({
          amount: amount.toString(),
          from: fromCurrency,
          to: toCurrency,
        });

        const response = await fetch(`/api/currency/convert?${params}`, {
          method: "GET",
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
  };
}

/**
 * Hook to fetch and cache a specific currency conversion
 * Automatically deduplicates requests with same parameters
 */
export function useCachedConversion(
  amount: number,
  fromCurrency: string,
  toCurrency: string
) {
  return useQuery({
    queryKey: ["currency", "convert", { from: fromCurrency, to: toCurrency, amount }],
    queryFn: async () => {
      const params = new URLSearchParams({
        amount: amount.toString(),
        from: fromCurrency,
        to: toCurrency,
      });

      const response = await fetch(`/api/currency/convert?${params}`, {
        method: "GET",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Conversion failed");
      }

      const result = await response.json();
      return {
        ...result,
        rateTimestamp: new Date(result.rateTimestamp),
      } as ConversionResult;
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    enabled: !!(amount && fromCurrency && toCurrency), // Only run when all params exist
  });
}
