"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

async function getSession() {
  return await auth.api.getSession({
    headers: await headers(),
  });
}

export async function getSettings() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .eq("user_id", session.user.id)
    .single();

  if (error && error.code !== "PGRST116") { // Ignore not found
    throw new Error(error.message);
  }

  return data;
}

export async function updateSettings(settings: {
  default_currency?: string;
  theme?: string;
}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const supabase = createAdminClient();
  
  // Upsert settings
  const { data, error } = await supabase
    .from("settings")
    .upsert({
      user_id: session.user.id,
      ...settings,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
