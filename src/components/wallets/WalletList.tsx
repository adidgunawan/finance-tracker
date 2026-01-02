"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WalletBalance } from "./WalletBalance";
import { WalletDialog } from "./WalletDialog";
import { useState, useEffect } from "react";
import type { WalletWithBalance } from "@/actions/wallets";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import { formatCurrency } from "@/lib/currency";

interface WalletListProps {
  wallets: WalletWithBalance[];
  loading?: boolean;
  onRefresh?: () => void;
}

export function WalletList({ wallets, loading, onRefresh }: WalletListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<WalletWithBalance | null>(null);
  const { baseCurrency, convertToBase, loading: conversionLoading } = useCurrencyConversion();
  const [totalNetWorth, setTotalNetWorth] = useState<number>(0);

  useEffect(() => {
    // Calculate total net worth by converting all wallets to base currency
    if (!conversionLoading && wallets.length > 0) {
      Promise.all(
        wallets.map(async (wallet) => {
          try {
            const result = await convertToBase(wallet.balance, wallet.currency || "USD");
            return result.convertedAmount;
          } catch (error) {
            // If conversion fails (unsupported currency pair), use original balance as fallback
            console.warn(`Skipping conversion for ${wallet.name} (${wallet.currency}):`, error);
            return wallet.balance;
          }
        })
      )
        .then((convertedBalances) => {
          const total = convertedBalances.reduce((sum, balance) => sum + balance, 0);
          setTotalNetWorth(total);
        })
        .catch((error) => {
          console.error("Failed to calculate total net worth:", error);
        });
    }
  }, [wallets, baseCurrency, conversionLoading, convertToBase]);

  const handleSetOpeningBalance = (wallet: WalletWithBalance) => {
    setSelectedWallet(wallet);
    setDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">Loading wallets...</p>
      </Card>
    );
  }

  if (wallets.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <div className="text-5xl mb-4">💳</div>
          <p className="text-muted-foreground mb-2">No wallets yet</p>
          <p className="text-sm text-muted-foreground">
            Create an asset account and mark it as a wallet to get started
          </p>
        </div>
      </Card>
    );
  }

  return (
    <>
      {/* Total Net Worth Summary */}
      <Card className="p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Net Worth</p>
            <p className="text-3xl font-bold text-primary mt-1">
              {formatCurrency(totalNetWorth, baseCurrency)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Estimated in {baseCurrency} • {wallets.length} wallet{wallets.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-3xl">💰</span>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Wallet Name</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead className="text-right">Balance / Estimated Value</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {wallets.map((wallet) => (
              <TableRow key={wallet.id}>
                <TableCell className="font-medium">{wallet.name}</TableCell>
                <TableCell>{wallet.currency || "USD"}</TableCell>
                <TableCell className="text-right">
                  <WalletBalance balance={wallet.balance} currency={wallet.currency} />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetOpeningBalance(wallet)}
                  >
                    Set Opening Balance
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <WalletDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        wallet={selectedWallet}
        onSuccess={handleDialogSuccess}
      />
    </>
  );
}
