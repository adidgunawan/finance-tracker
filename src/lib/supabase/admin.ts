import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";

// Singleton admin client instance
let adminClient: SupabaseClient<Database> | null = null;

// Admin client with Service Role Key to bypass RLS
// Use ONLY in Server Actions or API routes
// This function returns a singleton instance to prevent connection pool exhaustion
export function createAdminClient(): SupabaseClient<Database> {
  // Return existing client if already created
  if (adminClient) {
    return adminClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not defined");
  }

  // Use connection pooler URL if available, otherwise use direct URL
  // Connection pooler format: https://<project-ref>.supabase.co (already the format)
  // For better connection management in serverless, ensure we're using the pooler
  const url = supabaseUrl;

  adminClient = createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: "public",
    },
    global: {
      // Reduce connection overhead
      headers: {
        "x-client-info": "finance-tracker",
      },
    },
  });

  return adminClient;
}
