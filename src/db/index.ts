import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// Database is optional at build time. Vercel can statically analyze/collect
// API routes without requiring DATABASE_URL to exist during the build.
// Database-backed cache/settings are used when DATABASE_URL is configured;
// the API routes already have fallbacks for an unavailable database.
const databaseUrl = process.env.DATABASE_URL;

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

const poolConfig = databaseUrl ? { connectionString: databaseUrl } : {};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool(poolConfig);

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
