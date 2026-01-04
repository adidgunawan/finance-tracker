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

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface AccountNode extends Account {
  children: AccountNode[];
  level: number;
}

export function useAccounts() {
  const queryClient = useQueryClient();

  const {
      data: accounts = [],
      isLoading: loading,
      error: queryError
  } = useQuery({
      queryKey: ['accounts'],
      queryFn: async () => {
          const data = await getAccounts();
          return data || [];
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000,   // 30 minutes
  });

  const error = queryError instanceof Error ? queryError.message : (queryError ? "Failed to fetch accounts" : null);

  const { mutateAsync: addAccountMutation } = useMutation({
    mutationFn: createAccount,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });

  const { mutateAsync: editAccountMutation } = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Account> }) => updateAccount(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });

  const { mutateAsync: removeAccountMutation } = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });

  // Wrappers to match existing API
  const addAccount = async (account: Omit<AccountInsert, "user_id">) => {
    return addAccountMutation(account);
  };

  const editAccount = async (id: string, updates: Partial<Account>) => {
    return editAccountMutation({ id, updates });
  };

  const removeAccount = async (id: string) => {
    return removeAccountMutation(id);
  };

  // Build tree structure (memoized via function, but could use useMemo if expensive)
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

  // Only rebuild tree if accounts change
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
    refreshAccounts: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
    getAccountsByType,
    getActiveAccounts,
  };
}
