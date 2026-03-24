/**
 * Simple sliding-window in-memory rate limiter.
 * Good enough for single-instance deployments; for multi-instance,
 * swap the Map for a Redis-backed store.
 */

type Entry = { count: number; resetAt: number };

const buckets = new Map<string, Entry>();

// Periodically evict expired entries to prevent unbounded growth
const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

function maybeCleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Check whether a request should be allowed.
 * @param key     Unique identifier (e.g. `chat:${workspaceId}`)
 * @param limit   Max requests per window
 * @param windowMs Window size in milliseconds
 * @returns `{ allowed: true }` or `{ allowed: false, retryAfterMs }`
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: true } | { allowed: false; retryAfterMs: number } {
  maybeCleanup();
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count < limit) {
    entry.count++;
    return { allowed: true };
  }

  return { allowed: false, retryAfterMs: entry.resetAt - now };
}
