"use client";

import { useQuery } from "@tanstack/react-query";
import { getSettings } from "@/actions/settings";
import { formatCurrency, getCurrencySymbol } from "@/lib/currency";

export function useCurrency() {
  const {
    data: currency = "IDR",
    isLoading: loading,
  } = useQuery({
    queryKey: ["settings", "currency"],
    queryFn: async () => {
      const settings = await getSettings();
      return settings?.default_currency || "IDR";
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - shares cache with useCurrencyConversion
  });

  return {
    currency,
    loading,
    format: (amount: number, options?: { showSymbol?: boolean; decimals?: number; currency?: string }) =>
      formatCurrency(amount, options?.currency || currency, options),
    symbol: getCurrencySymbol(currency),
  };
}

