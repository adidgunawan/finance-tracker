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
import { useState } from "react";
import type { WalletWithBalance } from "@/actions/wallets";

interface WalletListProps {
  wallets: WalletWithBalance[];
  loading?: boolean;
  onRefresh?: () => void;
}

export function WalletList({ wallets, loading, onRefresh }: WalletListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<WalletWithBalance | null>(null);

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
      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Wallet Name</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead className="text-right">Balance</TableHead>
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
