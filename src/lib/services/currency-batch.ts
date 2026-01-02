/**
 * Batch Currency Conversion Service
 * 
 * Eliminates N+1 query problem by batch-converting multiple amounts
 * in a single optimized operation with parallel fetching.
 */

import { getExchangeRate, type ConversionResult } from "./exchange-rate";

export interface BatchConversionRequest {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
}

export interface BatchConversionResult extends ConversionResult {
  index: number; // Original index in request array
}

/**
 * Convert multiple amounts in batch with optimized parallel fetching
 * 
 * Benefits:
 * - Parallel rate fetching (vs sequential N calls)
 * - Deduplicates currency pairs
 * - Leverages 3-tier caching
 * 
 * Example: 50 transactions → 3 unique currency pairs → 3 API calls max (or 0 if cached)
 */
export async function convertCurrencyBatch(
  requests: BatchConversionRequest[]
): Promise<BatchConversionResult[]> {
  if (requests.length === 0) {
    return [];
  }

  // Step 1: Extract unique currency pairs
  const uniquePairs = new Map<string, { from: string; to: string }>();
  
  for (const req of requests) {
    const from = req.fromCurrency.toUpperCase();
    const to = req.toCurrency.toUpperCase();
    const key = `${from}_${to}`;
    
    if (!uniquePairs.has(key)) {
      uniquePairs.set(key, { from, to });
    }
  }

  // Step 2: Fetch all rates in parallel
  const ratePromises = Array.from(uniquePairs.values()).map(({ from, to }) =>
    getExchangeRate(from, to).catch((error) => {
      console.error(`Failed to get rate for ${from}/${to}:`, error);
      return null;
    })
  );

  const rates = await Promise.all(ratePromises);

  // Step 3: Build rate lookup map
  const rateMap = new Map<string, number>();
  rates.forEach((rate, index) => {
    if (rate) {
      const pair = Array.from(uniquePairs.values())[index];
      const key = `${pair.from}_${pair.to}`;
      rateMap.set(key, rate.rate);
    }
  });

  // Step 4: Apply conversions to all requests
  const results: BatchConversionResult[] = requests.map((req, index) => {
    const from = req.fromCurrency.toUpperCase();
    const to = req.toCurrency.toUpperCase();
    const key = `${from}_${to}`;
    
    // Same currency = 1:1
    const rate = from === to ? 1.0 : (rateMap.get(key) ?? 1.0);
    const convertedAmount = req.amount * rate;

    return {
      index,
      originalAmount: req.amount,
      originalCurrency: from,
      convertedAmount,
      convertedCurrency: to,
      exchangeRate: rate,
      rateTimestamp: new Date(),
    };
  });

  return results;
}

/**
 * Batch convert amounts to a single base currency
 * Common use case: dashboard showing all balances in user's base currency
 */
export async function convertToBaseCurrencyBatch(
  amounts: { amount: number; currency: string }[],
  baseCurrency: string
): Promise<number[]> {
  const requests: BatchConversionRequest[] = amounts.map((item) => ({
    amount: item.amount,
    fromCurrency: item.currency,
    toCurrency: baseCurrency,
  }));

  const results = await convertCurrencyBatch(requests);
  
  // Return in original order
  return results
    .sort((a, b) => a.index - b.index)
    .map((r) => r.convertedAmount);
}
