"use client";

import { useState, useEffect } from "react";
import { getSettings } from "@/actions/settings";
import { formatCurrency, getCurrencySymbol } from "@/lib/currency";

export function useCurrency() {
  const [currency, setCurrency] = useState<string>("IDR");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCurrency();
  }, []);

  const loadCurrency = async () => {
    try {
      const settings = await getSettings();
      if (settings?.default_currency) {
        setCurrency(settings.default_currency);
      }
    } catch (error) {
      console.error("Failed to load currency:", error);
    } finally {
      setLoading(false);
    }
  };

  return {
    currency,
    loading,
    format: (amount: number, options?: { showSymbol?: boolean; decimals?: number }) =>
      formatCurrency(amount, currency, options),
    symbol: getCurrencySymbol(currency),
  };
}

