"use client";

import { useState, useEffect } from "react";
import type { Database } from "@/lib/supabase/types";
import { 
  getAccounts, 
  createAccount, 
  updateAccount, 
  deleteAccount 
} from "@/actions/accounts";

type Account = Database["public"]["Tables"]["chart_of_accounts"]["Row"];
type AccountInsert = Database["public"]["Tables"]["chart_of_accounts"]["Insert"];

export interface AccountNode extends Account {
  children: AccountNode[];
  level: number;
}

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const data = await getAccounts();
      setAccounts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch accounts");
    } finally {
      setLoading(false);
    }
  };

  const addAccount = async (account: Omit<AccountInsert, "user_id">) => {
    try {
      const newAccount = await createAccount(account);
      setAccounts((prev) => [...prev, newAccount]);
      return newAccount;
    } catch (err) {
      throw err;
    }
  };

  const editAccount = async (id: string, updates: Partial<Account>) => {
    try {
      const updatedAccount = await updateAccount(id, updates);
      setAccounts((prev) =>
        prev.map((acc) => (acc.id === id ? updatedAccount : acc))
      );
      return updatedAccount;
    } catch (err) {
      throw err;
    }
  };

  const removeAccount = async (id: string) => {
    try {
      await deleteAccount(id);
      setAccounts((prev) => prev.filter((acc) => acc.id !== id));
    } catch (err) {
      throw err;
    }
  };

  // Build tree structure
  const buildTree = (
    allAccounts: Account[],
    parentId: string | null = null,
    level = 0
  ): AccountNode[] => {
    return allAccounts
      .filter((account) => account.parent_id === parentId)
      .map((account) => ({
        ...account,
        children: buildTree(allAccounts, account.id, level + 1),
        level,
      }));
  };

  const accountsTree = buildTree(accounts);

  const getAccountsByType = (type: Account["type"]) => {
    return accounts.filter((account) => account.type === type);
  };

  const getActiveAccounts = () => {
    return accounts.filter((account) => account.is_active);
  };

  return {
    accounts,
    accountsTree,
    loading,
    error,
    createAccount: addAccount,
    updateAccount: editAccount,
    deleteAccount: removeAccount,
    refreshAccounts: fetchAccounts,
    getAccountsByType,
    getActiveAccounts,
  };
}
