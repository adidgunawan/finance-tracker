"use client";

import { useState, useEffect } from "react";
import { PlusIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { WalletList } from "@/components/wallets/WalletList";
import { AccountDialog } from "@/components/accounts/AccountDialog";
import { getWalletsWithBalance } from "@/actions/wallets";
import { createAccount, getAccounts } from "@/actions/accounts";
import type { Database } from "@/lib/supabase/types";

type Account = Database["public"]["Tables"]["chart_of_accounts"]["Row"];
import type { WalletWithBalance } from "@/actions/wallets";

type AccountType = Database["public"]["Tables"]["chart_of_accounts"]["Row"]["type"];

export default function WalletsPage() {
  const [wallets, setWallets] = useState<WalletWithBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const loadWallets = async () => {
    setLoading(true);
    try {
      const walletData = await getWalletsWithBalance();
      setWallets(walletData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load wallets");
    } finally {
      setLoading(false);
    }
  };

  const loadAccounts = async () => {
    try {
      const accountData = await getAccounts();
      setAccounts(accountData);
    } catch (error) {
      console.error("Failed to load accounts:", error);
    }
  };

  useEffect(() => {
    loadWallets();
    loadAccounts();
  }, []);

  const handleSaveAccount = async (data: {
    name: string;
    type: AccountType;
    parent_id: string | null;
    level: number;
    currency: string | null;
    is_wallet?: boolean;
  }) => {
    try {
      await createAccount({
        ...data,
        type: "asset", // Force asset type for wallets
        is_wallet: true, // Force wallet flag for new wallets from this page
      });
      toast.success("Wallet created successfully");
      setAccountDialogOpen(false);
      await loadAccounts();
      await loadWallets();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create wallet");
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-[98%] mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Wallets</h1>
            <p className="text-muted-foreground mt-1">
              Manage your wallet accounts and opening balances
            </p>
          </div>
          <Button onClick={() => setAccountDialogOpen(true)}>
            <PlusIcon className="w-4 h-4 mr-2" />
            New Wallet
          </Button>
        </div>

        <WalletList wallets={wallets} loading={loading} onRefresh={loadWallets} />

        <AccountDialog
          open={accountDialogOpen}
          onOpenChange={setAccountDialogOpen}
          account={null}
          accounts={accounts}
          onSave={handleSaveAccount}
        />
      </div>
    </div>
  );
}
