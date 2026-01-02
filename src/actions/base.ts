"use server";

import { cache } from "react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/client";

// Helper to get current session on server
// Cached to prevent multiple session fetches in the same request
export const getSession = cache(async () => {
  return await auth.api.getSession({
    headers: await headers(),
  });
});

// Server Action for Accounts with request deduplication
// Multiple components calling this in the same request will only fetch once
export const getAccounts = cache(async () => {
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
});

// We will need to create actions for all operations
// This file serves as the base for data access
