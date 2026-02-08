import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

// Prevent instantiation in Edge Runtime (Middleware)
// Prisma Client cannot run in Edge Runtime.
const isEdge = process.env.NEXT_RUNTIME === 'edge';

let prisma: PrismaClient;

if (isEdge) {
  // In Edge runtime, we can't use Prisma. 
  // We cast to any to satisfy TS, but accessing this will crash.
  // This file should NOT be imported in middleware.
  prisma = null as any;
} else {
  if (!process.env.DATABASE_URL) {
    // Warn instead of throw to allow build to proceed without env vars
    console.warn("DATABASE_URL is not set. Prisma Client will fail to connect.");
  }

  if (!globalThis.prisma) {
    globalThis.prisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }
  prisma = globalThis.prisma;
}

export const db = prisma;
