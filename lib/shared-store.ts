import { Redis } from "@upstash/redis";

type Entry = { value: string; expiresAt: number };

const localStore = new Map<string, Entry>();
let redisClient: Redis | null = null;

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  if (!redisClient) {
    redisClient = new Redis({ url, token });
  }
  return redisClient;
}

export async function sharedGet(key: string): Promise<string | null> {
  const redis = getRedis();
  if (redis) {
    const value = await redis.get<string>(key);
    return typeof value === "string" ? value : null;
  }
  const hit = localStore.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    localStore.delete(key);
    return null;
  }
  return hit.value;
}

export async function sharedSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(key, value, { ex: ttlSeconds });
    return;
  }
  localStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export async function sharedDelete(key: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.del(key);
    return;
  }
  localStore.delete(key);
}

export async function sharedIncr(key: string): Promise<number> {
  const redis = getRedis();
  if (redis) {
    return await redis.incr(key);
  }
  const now = Date.now();
  const current = localStore.get(key);
  const parsed = current && current.expiresAt > now ? Number(current.value) : 0;
  const next = (Number.isFinite(parsed) ? parsed : 0) + 1;
  localStore.set(key, {
    value: String(next),
    expiresAt: current?.expiresAt ?? now + 60_000,
  });
  return next;
}

export async function sharedExpire(key: string, ttlSeconds: number): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.expire(key, ttlSeconds);
    return;
  }
  const hit = localStore.get(key);
  if (!hit) return;
  localStore.set(key, { ...hit, expiresAt: Date.now() + ttlSeconds * 1000 });
}
