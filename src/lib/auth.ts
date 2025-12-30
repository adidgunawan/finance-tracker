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
let dbPool: Pool;
try {
  dbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Add connection pool settings for Supabase
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  
  // Test connection
  dbPool.on('error', (err) => {
    console.error('Unexpected database pool error:', err);
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
