/**
 * Exchange Rate Service
 * 
 * Handles fetching and caching of currency exchange rates.
 * Features:
 * - Primary API: ExchangeRate-API (165 currencies including VND)
 * - Fallback API: Frankfurter (30 major currencies)
 * - 24-hour caching in database to stay within free tier limits
 * - Graceful fallback to stale cached rates if both APIs fail
 */

import { createAdminClient } from "@/lib/supabase/admin";

// Primary API: ExchangeRate-API (free tier, 165 currencies)
const PRIMARY_API_URL = "https://api.exchangerate-api.com/v4/latest";

// Fallback API: Frankfurter (ECB data, 30 currencies)
const FALLBACK_API_URL = "https://api.frankfurter.app";

// Cache duration in hours (default: 24 hours for free tier)
const CACHE_DURATION_HOURS = parseInt(process.env.EXCHANGE_RATE_CACHE_HOURS || "24", 10);

export interface ExchangeRate {
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  fetchedAt: Date;
}

export interface ConversionResult {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number;
  convertedCurrency: string;
  exchangeRate: number;
  rateTimestamp: Date;
}

/**
 * Check if a cached rate is stale (older than CACHE_DURATION_HOURS)
 */
function isRateStale(fetchedAt: Date): boolean {
  const now = new Date();
  const diffHours = (now.getTime() - fetchedAt.getTime()) / (1000 * 60 * 60);
  return diffHours > CACHE_DURATION_HOURS;
}

/**
 * Get cached exchange rate from database
 */
async function getCachedRate(
  fromCurrency: string,
  toCurrency: string
): Promise<ExchangeRate | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("exchange_rates")
    .select("*")
    .eq("base_currency", fromCurrency.toUpperCase())
    .eq("target_currency", toCurrency.toUpperCase())
    .single();

  if (error || !data) {
    return null;
  }

  return {
    baseCurrency: data.base_currency,
    targetCurrency: data.target_currency,
    rate: Number(data.rate),
    fetchedAt: new Date(data.fetched_at),
  };
}

/**
 * Fetch exchange rate from ExchangeRate-API (primary) with Frankfurter fallback
 */
async function fetchRateFromAPI(
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  // Try ExchangeRate-API first (supports 165 currencies including VND)
  try {
    const response = await fetch(`${PRIMARY_API_URL}/${from}`);

    if (!response.ok) {
      throw new Error(`Primary API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    const rate = data.rates?.[to];

    if (!rate) {
      throw new Error(`Currency ${to} not found in primary API response`);
    }

    return Number(rate);
  } catch (primaryError) {
    // Fallback to Frankfurter API (ECB data, 30 major currencies)
    console.warn(
      `Primary API failed for ${from}/${to}, trying fallback:`,
      primaryError instanceof Error ? primaryError.message : "Unknown error"
    );

    try {
      const response = await fetch(
        `${FALLBACK_API_URL}/latest?from=${from}&to=${to}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Unsupported currency pair: ${from}/${to}`);
        }
        throw new Error(`Fallback API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      const rate = data.rates?.[to];

      if (!rate) {
        throw new Error(`Rate not found in fallback API response for ${from}/${to}`);
      }

      return Number(rate);
    } catch (fallbackError) {
      // Both APIs failed
      if (fallbackError instanceof Error) {
        throw fallbackError;
      }
      throw new Error("Both primary and fallback APIs failed");
    }
  }
}

/**
 * Save exchange rate to database cache
 */
async function cacheRate(
  fromCurrency: string,
  toCurrency: string,
  rate: number
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.from("exchange_rates").upsert(
    {
      base_currency: fromCurrency.toUpperCase(),
      target_currency: toCurrency.toUpperCase(),
      rate,
      fetched_at: new Date().toISOString(),
    },
    {
      onConflict: "base_currency,target_currency",
    }
  );

  if (error) {
    console.error("Failed to cache exchange rate:", error);
    // Don't throw - caching failure should not block the conversion
  }
}

/**
 * Get exchange rate between two currencies
 * 
 * Strategy:
 * 1. Check for cached rate
 * 2. If cached and fresh, return it
 * 3. If cached but stale, try API; fallback to stale cache if API fails
 * 4. If not cached, fetch from API and cache it
 * 
 * @throws Error if currency pair is unsupported or API is down with no cached rate
 */
export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<ExchangeRate> {
  // Same currency = 1:1 rate
  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
    return {
      baseCurrency: fromCurrency.toUpperCase(),
      targetCurrency: toCurrency.toUpperCase(),
      rate: 1.0,
      fetchedAt: new Date(),
    };
  }

  // Check cache first
  const cachedRate = await getCachedRate(fromCurrency, toCurrency);

  if (cachedRate && !isRateStale(cachedRate.fetchedAt)) {
    // Fresh cached rate - use it
    return cachedRate;
  }

  // Try to fetch fresh rate from API
  try {
    const rate = await fetchRateFromAPI(fromCurrency, toCurrency);
    await cacheRate(fromCurrency, toCurrency, rate);

    return {
      baseCurrency: fromCurrency.toUpperCase(),
      targetCurrency: toCurrency.toUpperCase(),
      rate,
      fetchedAt: new Date(),
    };
  } catch (error) {
    // API failed - fallback to stale cached rate if available
    if (cachedRate) {
      console.warn(
        `Using stale cached rate for ${fromCurrency}/${toCurrency}:`,
        error instanceof Error ? error.message : "Unknown error"
      );
      return cachedRate;
    }

    // No cached rate and API failed - throw error
    throw error;
  }
}

/**
 * Batch refresh exchange rates for multiple currency pairs
 * Useful for pre-warming the cache
 */
export async function refreshExchangeRates(
  currencies: string[],
  baseCurrency: string
): Promise<void> {
  const uniqueCurrencies = [...new Set(currencies)].filter(
    (c) => c.toUpperCase() !== baseCurrency.toUpperCase()
  );

  const promises = uniqueCurrencies.map((currency) =>
    getExchangeRate(baseCurrency, currency).catch((error) => {
      console.error(
        `Failed to refresh rate for ${baseCurrency}/${currency}:`,
        error
      );
      return null;
    })
  );

  await Promise.all(promises);
}

/**
 * Convert amount from one currency to another
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<ConversionResult> {
  const exchangeRate = await getExchangeRate(fromCurrency, toCurrency);
  const convertedAmount = amount * exchangeRate.rate;

  return {
    originalAmount: amount,
    originalCurrency: fromCurrency.toUpperCase(),
    convertedAmount,
    convertedCurrency: toCurrency.toUpperCase(),
    exchangeRate: exchangeRate.rate,
    rateTimestamp: exchangeRate.fetchedAt,
  };
}

/**
 * Convert amount to user's base currency
 * Convenience wrapper around convertCurrency
 */
export async function convertToBaseCurrency(
  amount: number,
  fromCurrency: string,
  baseCurrency: string
): Promise<ConversionResult> {
  return convertCurrency(amount, fromCurrency, baseCurrency);
}
