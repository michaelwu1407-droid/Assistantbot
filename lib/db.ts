import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

// Prevent instantiation in Edge Runtime (Middleware)
// Prisma Client cannot run in Edge Runtime.
const isEdge = process.env.NEXT_RUNTIME === 'edge';

let prisma: PrismaClient | null = null;

if (isEdge) {
  // In Edge runtime, we can't use Prisma. 
  // This file should NOT be imported in middleware.
  prisma = null;
} else if (!process.env.DATABASE_URL) {
  // Warn instead of throw to allow build to proceed without env vars
  console.warn("DATABASE_URL is not set. Prisma Client will not be initialized.");
  prisma = null;
} else {
  if (!globalThis.prisma) {
    globalThis.prisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }
  prisma = globalThis.prisma;
}

// Export a proxy that throws a helpful error if db is null
export const db: PrismaClient = prisma ?? new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (prop === 'then') return undefined; // Prevent promise chaining issues
    throw new Error(
      `Database not configured. Please set DATABASE_URL environment variable. Attempted to access: ${String(prop)}`
    );
  }
});
