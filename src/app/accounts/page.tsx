"use client";

import { useState, useMemo, useCallback } from "react";
import { PlusIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDownIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { AccountDialog } from "@/components/accounts/AccountDialog";
import { BulkCurrencyUpdateDialog } from "@/components/accounts/BulkCurrencyUpdateDialog";
import { useAccounts, type AccountNode } from "@/hooks/useAccounts";
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
    refreshAccounts,
  } = useAccounts();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());
  const [bulkUpdateDialogOpen, setBulkUpdateDialogOpen] = useState(false);

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
      toast.success("Account updated successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update account");
    }
  };

  const handleSave = async (data: {
    name: string;
    type: Account["type"];
    parent_id: string | null;
    level: number;
    currency: string | null;
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

  // Get all account IDs from the tree (including children)
  const getAllAccountIds = useCallback((accountNodes: AccountNode[]): string[] => {
    const ids: string[] = [];
    const traverse = (nodes: AccountNode[]) => {
      nodes.forEach((node) => {
        ids.push(node.id);
        if (node.children.length > 0) {
          traverse(node.children);
        }
      });
    };
    traverse(accountNodes);
    return ids;
  }, []);

  // Get all account IDs from all types
  const allAccountIds = useMemo(() => {
    return getAllAccountIds(accountsTree);
  }, [accountsTree, getAllAccountIds]);

  const handleToggleSelect = (accountId: string) => {
    setSelectedAccountIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(accountId)) {
        newSet.delete(accountId);
      } else {
        newSet.add(accountId);
      }
      return newSet;
    });
  };

  const handleBulkUpdateCurrency = async (accountIds: string[], currency: string) => {
    try {
      const updatePromises = accountIds.map((id) =>
        updateAccount(id, { currency })
      );
      await Promise.all(updatePromises);
      setSelectedAccountIds(new Set());
      refreshAccounts();
    } catch (error) {
      throw error;
    }
  };

  const handleOpenBulkUpdate = () => {
    if (selectedAccountIds.size === 0) {
      toast.error("Please select at least one account");
      return;
    }
    setBulkUpdateDialogOpen(true);
  };

  // Group accounts by type
  const accountsByType = useMemo(() => {
    const grouped: Record<string, AccountNode[]> = {
      asset: [],
      liability: [],
      income: [],
      expense: [],
    };

    accountsTree.forEach((account) => {
      if (grouped[account.type]) {
        grouped[account.type].push(account);
      }
    });

    return grouped;
  }, [accountsTree]);

  const typeLabels: Record<string, string> = {
    asset: "Assets",
    liability: "Liabilities",
    income: "Income",
    expense: "Expenses",
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
          <div className="flex items-center gap-2">
            {selectedAccountIds.size > 0 && (
              <div className="text-sm text-muted-foreground mr-2">
                {selectedAccountIds.size} selected
              </div>
            )}
            <Button
              onClick={handleOpenBulkUpdate}
              variant="outline"
              disabled={selectedAccountIds.size === 0}
            >
              Bulk Update Currency
            </Button>
            <Button
              onClick={handleNewAccount}
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              New Account
            </Button>
          </div>
        </div>

        <Card className="p-6">
          {accounts.length === 0 ? (
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
            <div className="space-y-4">
              {(["asset", "liability", "income", "expense"] as const).map((type) => {
                const typeAccounts = accountsByType[type];
                if (typeAccounts.length === 0) return null;

                return (
                  <AccountTypeGroup
                    key={type}
                    type={type}
                    label={typeLabels[type]}
                    accounts={typeAccounts}
                    allAccounts={accounts}
                    selectedAccountIds={selectedAccountIds}
                    onToggleSelect={handleToggleSelect}
                    onEdit={handleEdit}
                    onToggleActive={handleToggleActive}
                  />
                );
              })}
            </div>
          )}
        </Card>

        <AccountDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          account={editingAccount}
          accounts={accounts}
          onSave={handleSave}
        />

        <BulkCurrencyUpdateDialog
          open={bulkUpdateDialogOpen}
          onOpenChange={setBulkUpdateDialogOpen}
          selectedAccountIds={Array.from(selectedAccountIds)}
          onUpdate={handleBulkUpdateCurrency}
        />
      </div>
    </div>
  );
}

// Account Type Group Component
interface AccountTypeGroupProps {
  type: "asset" | "liability" | "income" | "expense";
  label: string;
  accounts: AccountNode[];
  allAccounts: Account[];
  selectedAccountIds: Set<string>;
  onToggleSelect: (accountId: string) => void;
  onEdit: (account: Account) => void;
  onToggleActive: (account: Account) => void;
}

function AccountTypeGroup({
  type,
  label,
  accounts,
  allAccounts,
  selectedAccountIds,
  onToggleSelect,
  onEdit,
  onToggleActive,
}: AccountTypeGroupProps) {
  const [isOpen, setIsOpen] = useState(true);

  const [expandedStates, setExpandedStates] = useState<Map<string, boolean>>(new Map());

  // Get all account IDs in this group (including children)
  const getAllGroupAccountIds = (accountNodes: AccountNode[]): string[] => {
    const ids: string[] = [];
    const traverse = (nodes: AccountNode[]) => {
      nodes.forEach((node) => {
        ids.push(node.id);
        if (node.children.length > 0) {
          traverse(node.children);
        }
      });
    };
    traverse(accountNodes);
    return ids;
  };

  const groupAccountIds = useMemo(() => getAllGroupAccountIds(accounts), [accounts]);
  const groupSelectedCount = groupAccountIds.filter((id) => selectedAccountIds.has(id)).length;
  const isGroupAllSelected = groupSelectedCount === groupAccountIds.length && groupAccountIds.length > 0;
  const isGroupIndeterminate = groupSelectedCount > 0 && groupSelectedCount < groupAccountIds.length;

  const handleGroupSelectAll = () => {
    if (isGroupAllSelected) {
      groupAccountIds.forEach((id) => {
        if (selectedAccountIds.has(id)) {
          onToggleSelect(id);
        }
      });
    } else {
      groupAccountIds.forEach((id) => {
        if (!selectedAccountIds.has(id)) {
          onToggleSelect(id);
        }
      });
    }
  };

  const setExpanded = (id: string, value: boolean) => {
    setExpandedStates((prev) => {
      const newMap = new Map(prev);
      newMap.set(id, value);
      return newMap;
    });
  };

  const renderAccountRows = (accountList: AccountNode[], level: number = 0): React.ReactNode[] => {
    const rows: React.ReactNode[] = [];
    
    accountList.forEach((account) => {
      const hasChildren = account.children.length > 0;
      const isExpanded = expandedStates.get(account.id) ?? true;
      const indent = level * 24;
      const isSelected = selectedAccountIds.has(account.id);

      rows.push(
        <TableRow
          key={account.id}
          className={!account.is_active ? "opacity-50" : ""}
        >
          <TableCell className="w-[4%]">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect(account.id)}
            />
          </TableCell>
          <TableCell className="font-medium w-[26%]" style={{ paddingLeft: `${indent + 16}px` }}>
            <div className="flex items-center gap-2 truncate">
              {hasChildren ? (
                <button
                  onClick={() => setExpanded(account.id, !isExpanded)}
                  className="flex-shrink-0 w-4 h-4 flex items-center justify-center"
                >
                  {isExpanded ? (
                    <ChevronDownIcon className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              ) : (
                <span className="w-4" />
              )}
              <span className="truncate">{account.name}</span>
            </div>
          </TableCell>
          <TableCell className="text-muted-foreground w-[20%] truncate">
            {account.parent_id
              ? allAccounts.find((a) => a.id === account.parent_id)?.name || "-"
              : "-"}
          </TableCell>
          <TableCell className="w-[8%]">{account.level}</TableCell>
          <TableCell className="w-[12%]">{account.currency || "-"}</TableCell>
          <TableCell className="w-[10%]">
            <Badge variant={account.is_active ? "default" : "secondary"}>
              {account.is_active ? "Active" : "Inactive"}
            </Badge>
          </TableCell>
          <TableCell className="w-[20%] text-right">
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(account)}
                className="h-8"
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleActive(account)}
                className="h-8"
              >
                {account.is_active ? "Disable" : "Enable"}
              </Button>
            </div>
          </TableCell>
        </TableRow>
      );

      // Add children rows if expanded
      if (hasChildren && isExpanded) {
        rows.push(...renderAccountRows(account.children, level + 1));
      }
    });

    return rows;
  };

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-4 hover:bg-accent transition-colors">
            <div className="flex items-center gap-2">
              {isOpen ? (
                <ChevronDownIcon className="w-4 h-4" />
              ) : (
                <ChevronRightIcon className="w-4 h-4" />
              )}
              <h3 className="text-lg font-semibold capitalize">{label}</h3>
              <Badge variant="outline" className="ml-2">
                {accounts.length}
              </Badge>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[4%]">
                  <Checkbox
                    checked={isGroupAllSelected}
                    onCheckedChange={handleGroupSelectAll}
                  />
                </TableHead>
                <TableHead className="w-[26%]">Name</TableHead>
                <TableHead className="w-[20%]">Parent Account</TableHead>
                <TableHead className="w-[8%]">Level</TableHead>
                <TableHead className="w-[12%]">Currency</TableHead>
                <TableHead className="w-[10%]">Status</TableHead>
                <TableHead className="w-[20%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {renderAccountRows(accounts, 0)}
            </TableBody>
          </Table>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
