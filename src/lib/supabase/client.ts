import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

// Singleton client instance to prevent recreation on every call
let clientInstance: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  // Return existing client if already created
  if (clientInstance) {
    return clientInstance;
  }

  // Create new client instance (only happens once)
  clientInstance = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return clientInstance;
}
