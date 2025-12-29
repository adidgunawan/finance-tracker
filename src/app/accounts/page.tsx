"use client";

import { useState } from "react";
import { PlusIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AccountTreeView } from "@/components/accounts/AccountTree";
import { AccountDialog } from "@/components/accounts/AccountDialog";
import { useAccounts } from "@/hooks/useAccounts";
import type { Database } from "@/lib/supabase/types";

type Account = Database["public"]["Tables"]["chart_of_accounts"]["Row"];

export default function AccountsPage() {
  const {
    accounts,
    accountsTree,
    loading,
    error,
    createAccount,
    updateAccount,
  } = useAccounts();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const handleEdit = (account: any) => {
    const fullAccount = accounts.find((a) => a.id === account.id);
    if (fullAccount) {
      setEditingAccount(fullAccount);
      setDialogOpen(true);
    }
  };

  const handleToggleActive = async (account: any) => {
    try {
      await updateAccount(account.id, { is_active: !account.is_active });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to update account");
    }
  };

  const handleSave = async (data: {
    name: string;
    type: Account["type"];
    parent_id: string | null;
    level: number;
  }) => {
    if (editingAccount) {
      await updateAccount(editingAccount.id, data);
    } else {
      await createAccount(data);
    }
  };

  const handleNewAccount = () => {
    setEditingAccount(null);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-[98%] mx-auto">
          <p className="text-muted-foreground">Loading accounts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-[98%] mx-auto">
          <p className="text-destructive">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-[98%] mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">
              Chart of Accounts
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your account hierarchy
            </p>
          </div>
          <Button
            onClick={handleNewAccount}
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            New Account
          </Button>
        </div>

        <Card className="p-6">
          {accountsTree.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                No accounts yet. Create your first account to get started.
              </p>
              <Button
                onClick={handleNewAccount}
                variant="outline"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Create Account
              </Button>
            </div>
          ) : (
            <AccountTreeView
              accounts={accountsTree}
              onEdit={handleEdit}
              onToggleActive={handleToggleActive}
            />
          )}
        </Card>

        <AccountDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          account={editingAccount}
          accounts={accounts}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}
