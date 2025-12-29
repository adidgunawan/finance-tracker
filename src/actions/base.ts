"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/client";

// Helper to get current session on server
export async function getSession() {
  return await auth.api.getSession({
    headers: await headers(),
  });
}

// Example Server Action for Accounts
// We will replace useAccounts hook logic with this
export async function getAccounts() {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("chart_of_accounts")
    .select("*")
    .eq("user_id", session.user.id) // Use Better Auth ID
    .order("type", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

// We will need to create actions for all operations
// This file serves as the base for data access
