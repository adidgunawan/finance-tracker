"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getWalletsWithBalance,
  type WalletWithBalance,
} from "@/actions/wallets";
import {
  createAccount,
  updateAccount,
  deleteAccount,
} from "@/actions/accounts";
import type { Database } from "@/lib/supabase/types";

type AccountInsert = Database["public"]["Tables"]["chart_of_accounts"]["Insert"];
type AccountUpdate = Partial<Database["public"]["Tables"]["chart_of_accounts"]["Row"]>;

export function useWallets() {
  const queryClient = useQueryClient();

  // Fetch wallets with balance
  const {
    data: wallets = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ["wallets"],
    queryFn: async () => {
      const data = await getWalletsWithBalance();
      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const error = queryError instanceof Error ? queryError.message : null;

  // Create wallet mutation
  const { mutateAsync: createWalletMutation } = useMutation({
    mutationFn: async (data: Omit<AccountInsert, "user_id">) => {
      return await createAccount({
        ...data,
        type: "asset",
        is_wallet: true,
      });
    },
    onSuccess: () => {
      // Invalidate both wallets and accounts cache
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });

  // Update wallet mutation
  const { mutateAsync: updateWalletMutation } = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: AccountUpdate }) => {
      return await updateAccount(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });

  // Delete wallet mutation
  const { mutateAsync: deleteWalletMutation } = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });

  return {
    wallets,
    loading,
    error,
    createWallet: createWalletMutation,
    updateWallet: updateWalletMutation,
    deleteWallet: deleteWalletMutation,
    refreshWallets: refetch,
  };
}
