/**
 * Simple sliding-window in-memory rate limiter.
 * Good enough for single-instance deployments; for multi-instance,
 * swap the Map for a Redis-backed store.
 */

import { sharedExpire, sharedGet, sharedIncr } from "@/lib/shared-store";

/** Best-effort client IP from forwarding headers; safe to use as a rate-limit key. */
export function getClientIp(req: Request): string {
  const fromForwardedFor = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim();
  if (fromForwardedFor) return fromForwardedFor;
  const fromVercel = req.headers.get("x-vercel-forwarded-for");
  if (fromVercel) return fromVercel.split(",")[0]?.trim() || "unknown";
  const fromRealIp = req.headers.get("x-real-ip");
  if (fromRealIp) return fromRealIp.trim();
  return "unknown";
}

/**
 * Check whether a request should be allowed.
 * @param key     Unique identifier (e.g. `chat:${workspaceId}`)
 * @param limit   Max requests per window
 * @param windowMs Window size in milliseconds
 * @returns `{ allowed: true }` or `{ allowed: false, retryAfterMs }`
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: true } | { allowed: false; retryAfterMs: number }> {
  const now = Date.now();
  const bucketKey = `rl:${key}:${Math.floor(now / windowMs)}`;
  const count = await sharedIncr(bucketKey);
  if (count === 1) {
    await sharedExpire(bucketKey, Math.ceil(windowMs / 1000));
  }
  if (count <= limit) {
    return { allowed: true };
  }
  const existing = await sharedGet(bucketKey);
  const retryAfterMs = Math.max(1000, windowMs - (now % windowMs));
  if (!existing) return { allowed: false, retryAfterMs };
  return { allowed: false, retryAfterMs };
}
