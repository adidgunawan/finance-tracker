// Currency formatting utility
// Maps currency codes to their symbols and formatting

import { ALL_CURRENCIES } from "./currencies";

// Build currency symbols map from comprehensive currency list
const CURRENCY_SYMBOLS: Record<string, string> = {};
ALL_CURRENCIES.forEach((currency) => {
  if (currency.symbol) {
    CURRENCY_SYMBOLS[currency.code] = currency.symbol;
  }
});

// Keep legacy symbols for backward compatibility
const LEGACY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  IDR: "Rp",
  JPY: "¥",
  SGD: "S$",
};

// Merge legacy symbols (they may have different values)
Object.assign(CURRENCY_SYMBOLS, LEGACY_SYMBOLS);

const CURRENCY_POSITIONS: Record<string, "before" | "after"> = {
  USD: "before",
  EUR: "before",
  GBP: "before",
  IDR: "before",
  JPY: "before",
  SGD: "before",
};

export function getCurrencySymbol(currencyCode: string = "USD"): string {
  return CURRENCY_SYMBOLS[currencyCode] || currencyCode;
}

/**
 * Format number with thousand separators
 */
function formatNumberWithSeparators(
  num: number,
  decimals: number,
  thousandSeparator: string = ".",
  decimalSeparator: string = ","
): string {
  // Round to specified decimals
  const rounded = Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
  
  // Split into integer and decimal parts
  const fixed = rounded.toFixed(decimals);
  const parts = fixed.split(".");
  const integerPart = parts[0];
  const decimalPart = parts[1];

  // Add thousand separators to integer part
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator);

  // Only show decimal part if it's not all zeros or if decimals > 0
  if (decimals > 0 && decimalPart && parseInt(decimalPart) > 0) {
    return `${formattedInteger}${decimalSeparator}${decimalPart}`;
  }
  return formattedInteger;
}

export function formatCurrency(
  amount: number,
  currencyCode: string = "USD",
  options?: {
    showSymbol?: boolean;
    decimals?: number;
  }
): string {
  const { showSymbol = true, decimals = 2 } = options || {};
  const symbol = getCurrencySymbol(currencyCode);
  const position = CURRENCY_POSITIONS[currencyCode] || "before";
  
  // Use dots for thousand separator for IDR, commas for others
  // Use comma for decimal separator for IDR, dot for others
  const thousandSeparator = currencyCode === "IDR" ? "." : ",";
  const decimalSeparator = currencyCode === "IDR" ? "," : ".";
  
  const formattedAmount = formatNumberWithSeparators(
    amount,
    decimals,
    thousandSeparator,
    decimalSeparator
  );

  if (!showSymbol) {
    return formattedAmount;
  }

  if (position === "before") {
    return `${symbol} ${formattedAmount}`;
  } else {
    return `${formattedAmount} ${symbol}`;
  }
}

