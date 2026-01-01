"use client";

import { formatCurrency } from "@/lib/currency";

interface WalletBalanceProps {
  balance: number;
  currency?: string | null;
}

export function WalletBalance({ balance, currency = "USD" }: WalletBalanceProps) {
  const formattedBalance = formatCurrency(balance, currency || "USD");
  const isPositive = balance >= 0;

  return (
    <span
      className={`font-semibold ${
        isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
      }`}
    >
      {formattedBalance}
    </span>
  );
}
