import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

// Fallback credentials if .env is missing (Development only)
// This fixes the "Environment variable not found" error when the server hasn't picked up .env yet
// Password '!!!' is encoded as '%21%21%21'
const FALLBACK_DB_URL = "postgresql://postgres.wiszqwowyzblpncfelgj:Tkks140799%21%21%21@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1";
const FALLBACK_DIRECT_URL = "postgresql://postgres.wiszqwowyzblpncfelgj:Tkks140799%21%21%21@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres";

// Polyfill environment variables if they are missing
// This is required because schema.prisma uses env("DATABASE_URL") which validates existence
if (typeof process !== "undefined" && process.env) {
  if (!process.env.DATABASE_URL) {
    console.warn("⚠️ DATABASE_URL missing in env, using fallback.");
    process.env.DATABASE_URL = FALLBACK_DB_URL;
  }
  if (!process.env.DIRECT_URL) {
    console.warn("⚠️ DIRECT_URL missing in env, using fallback.");
    process.env.DIRECT_URL = FALLBACK_DIRECT_URL;
  }
}

export const db = globalThis.prisma || new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

if (process.env.NODE_ENV !== "production") globalThis.prisma = db;
