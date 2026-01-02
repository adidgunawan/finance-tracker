"use client";

import { formatCurrency } from "@/lib/currency";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import { useEffect, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InfoCircledIcon } from "@radix-ui/react-icons";

interface WalletBalanceProps {
  balance: number;
  currency?: string | null;
}

export function WalletBalance({ balance, currency = "USD" }: WalletBalanceProps) {
  const { baseCurrency, convertToBase, loading: conversionLoading } = useCurrencyConversion();
  const [convertedBalance, setConvertedBalance] = useState<number | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [rateTimestamp, setRateTimestamp] = useState<Date | null>(null);

  const walletCurrency = currency || "USD";
  const isDifferentCurrency = walletCurrency.toUpperCase() !== baseCurrency.toUpperCase();

  useEffect(() => {
    if (isDifferentCurrency && !conversionLoading) {
      convertToBase(balance, walletCurrency)
        .then((result) => {
          setConvertedBalance(result.convertedAmount);
          setExchangeRate(result.exchangeRate);
          setRateTimestamp(result.rateTimestamp);
        })
        .catch((error) => {
          // Silently handle unsupported currency pairs
          // Don't show conversion if the currency pair is not supported
          console.warn(`Currency conversion not available for ${walletCurrency} to base currency:`, error.message);
          setConvertedBalance(null);
        });
    }
  }, [balance, walletCurrency, baseCurrency, isDifferentCurrency, conversionLoading, convertToBase]);

  const formattedBalance = formatCurrency(balance, walletCurrency);
  const isPositive = balance >= 0;
  const colorClass = isPositive
    ? "text-green-600 dark:text-green-400"
    : "text-red-600 dark:text-red-400";

  return (
    <div className="text-right">
      <div className={`font-semibold ${colorClass}`}>
        {formattedBalance}
      </div>
      
      {isDifferentCurrency && convertedBalance !== null && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-xs text-muted-foreground flex items-center justify-end gap-1 mt-0.5">
                <span>
                  ≈ {formatCurrency(convertedBalance, baseCurrency)}
                </span>
                <InfoCircledIcon className="h-3 w-3" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="left">
              <div className="text-xs space-y-1">
                <div>
                  Rate: 1 {walletCurrency} = {exchangeRate?.toFixed(4)} {baseCurrency}
                </div>
                {rateTimestamp && (
                  <div className="text-muted-foreground">
                    As of {rateTimestamp.toLocaleString()}
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
