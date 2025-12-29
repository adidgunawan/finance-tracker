import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // For client-side, use NEXT_PUBLIC_BETTER_AUTH_URL if set, otherwise use current origin
  // This works automatically for same-origin requests
  baseURL: typeof window !== "undefined" 
    ? (process.env.NEXT_PUBLIC_BETTER_AUTH_URL || window.location.origin)
    : undefined,
});
