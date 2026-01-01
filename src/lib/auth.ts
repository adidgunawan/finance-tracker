import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { isEmailAllowed } from "./auth-utils";

// Validate required environment variables
if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error(
    "BETTER_AUTH_SECRET is required but not set. Please add it to your .env.local file."
  );
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is required but not set. Please add it to your .env.local file."
  );
}

// Create database pool with error handling
// Export it so AuthGuard can reuse it instead of creating new connections
// IMPORTANT: For Supabase, use Transaction mode pooler URL (port 6543 or pooler URL)
// Session mode has strict connection limits that can cause MaxClientsInSessionMode errors
export let dbPool: Pool;
try {
  const connectionString = process.env.DATABASE_URL;
  
  // Validate connection string
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  // Check if using Supabase connection pooler (recommended for serverless)
  // Transaction mode pooler uses port 6543 or pooler URL
  // This prevents MaxClientsInSessionMode errors
  const isPoolerUrl = connectionString.includes(':6543') || 
                      connectionString.includes('pooler.supabase.com') ||
                      connectionString.includes('/pooler');

  dbPool = new Pool({
    connectionString,
    // Reduce pool size for Supabase - Transaction mode pooler can handle more concurrent requests
    // but each serverless function should use fewer connections
    max: isPoolerUrl ? 5 : 2, // Smaller pool for pooler, very small for direct connection
    idleTimeoutMillis: 10000, // Shorter idle timeout to release connections faster
    connectionTimeoutMillis: 5000, // Longer timeout to allow for connection establishment
    // Close idle connections faster
    keepAlive: true,
    keepAliveInitialDelayMillis: 0,
  });
  
  // Handle pool errors gracefully
  dbPool.on('error', (err) => {
    console.error('Unexpected database pool error:', err);
    // Don't throw - let the pool handle reconnection
  });

  dbPool.on('connect', () => {
    // Log connection events in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Database pool connection established');
    }
  });

  dbPool.on('remove', () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Database pool connection removed');
    }
  });
} catch (error) {
  console.error('Failed to create database pool:', error);
  throw error;
}

export const auth = betterAuth({
  database: dbPool,
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  hooks: {
    onBeforeUserCreate: async ({ user }: { user: any }) => {
      // Check if user email is in the allowed list before creating user
      const email = user?.email;
      
      if (!email) {
        throw new Error("Email not found in authentication data");
      }
      
      if (!isEmailAllowed(email)) {
        throw new Error("EMAIL_NOT_AUTHORIZED");
      }
      
      return { user };
    },
  } as any, // Type assertion to bypass TypeScript check - hook works at runtime
});
