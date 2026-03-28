import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

// Prevent instantiation in Edge Runtime (Middleware)
// Prisma Client cannot run in Edge Runtime.
const isEdge = process.env.NEXT_RUNTIME === 'edge';

let prisma: PrismaClient | null = null;
export const isDatabaseConfigured = !isEdge && Boolean(process.env.DATABASE_URL);

function withConnectionLimit(url: string): string {
  const rawLimit = process.env.DB_CONNECTION_LIMIT ?? process.env.PRISMA_CONNECTION_LIMIT ?? "5";
  const parsedLimit = Number.parseInt(rawLimit, 10);
  const safeLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 5;
  const hasParam = /([?&])connection_limit=/.test(url);
  if (hasParam) return url;
  const join = url.includes("?") ? "&" : "?";
  return `${url}${join}connection_limit=${safeLimit}`;
}

if (isEdge) {
  // In Edge runtime, we can't use Prisma. 
  // This file should NOT be imported in middleware.
  prisma = null;
} else if (!process.env.DATABASE_URL) {
  prisma = null;
} else {
  if (!globalThis.prisma) {
    const datasourceUrl = withConnectionLimit(process.env.DATABASE_URL);
    globalThis.prisma = new PrismaClient({
      datasources: { db: { url: datasourceUrl } },
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
