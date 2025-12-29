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
