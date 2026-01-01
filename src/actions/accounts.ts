"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

type AccountInsert = Database["public"]["Tables"]["chart_of_accounts"]["Insert"];
type Account = Database["public"]["Tables"]["chart_of_accounts"]["Row"];

async function getSession() {
  return await auth.api.getSession({
    headers: await headers(),
  });
}

export async function getAccounts() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("chart_of_accounts")
    .select("*")
    .eq("user_id", session.user.id)
    .order("type", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function createAccount(data: Omit<AccountInsert, "user_id">) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  // Validate: is_wallet can only be true for asset accounts
  if (data.is_wallet && data.type !== "asset") {
    throw new Error("Wallets can only be created for asset accounts");
  }

  const supabase = createAdminClient();
  const { data: account, error } = await supabase
    .from("chart_of_accounts")
    .insert({ ...data, user_id: session.user.id })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return account;
}

export async function updateAccount(
  id: string,
  updates: Partial<Omit<Account, "id" | "user_id" | "created_at" | "updated_at">>
) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  // If updating is_wallet to true, verify account is asset type
  if (updates.is_wallet === true) {
    const supabase = createAdminClient();
    
    // Get current account to check type
    const { data: currentAccount } = await supabase
      .from("chart_of_accounts")
      .select("type")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single();

    // If type is being updated, check new type, otherwise check current type
    const accountType = updates.type || currentAccount?.type;
    
    if (accountType !== "asset") {
      throw new Error("Wallets can only be created for asset accounts");
    }
  }

  // If changing type away from asset, set is_wallet to false
  if (updates.type && updates.type !== "asset") {
    updates.is_wallet = false;
  }

  const supabase = createAdminClient();
  const { data: account, error } = await supabase
    .from("chart_of_accounts")
    .update(updates)
    .eq("id", id)
    .eq("user_id", session.user.id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return account;
}

export async function deleteAccount(id: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("chart_of_accounts")
    .delete()
    .eq("id", id)
    .eq("user_id", session.user.id);

  if (error) throw new Error(error.message);
}
