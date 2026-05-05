/**
 * Entity Resolution Cache — short-lived cache for contact/deal lookups.
 *
 * During a single chat session, repeated references to the same contact
 * or deal shouldn't hit the DB each time. This cache lives for 30s and
 * is keyed per workspace.
 */

type CachedEntity = {
  id: string;
  name: string;
  type: "contact" | "deal";
  confidence: number;
  data: Record<string, unknown>;
  cachedAt: number;
};

const CACHE_TTL_MS = 30_000;
const MAX_ENTRIES_PER_WORKSPACE = 50;

const cache = new Map<string, CachedEntity[]>();

function cacheKey(workspaceId: string): string {
  return `entity:${workspaceId}`;
}

function pruneExpired(entries: CachedEntity[]): CachedEntity[] {
  const now = Date.now();
  return entries.filter((e) => now - e.cachedAt < CACHE_TTL_MS);
}

export function getCachedEntity(
  workspaceId: string,
  name: string,
  type?: "contact" | "deal",
): CachedEntity | null {
  const entries = cache.get(cacheKey(workspaceId));
  if (!entries) return null;

  const live = pruneExpired(entries);
  if (live.length !== entries.length) {
    cache.set(cacheKey(workspaceId), live);
  }

  const normalised = name.toLowerCase().trim();
  const match = live.find(
    (e) =>
      e.name.toLowerCase().trim() === normalised &&
      (!type || e.type === type),
  );
  return match ?? null;
}

export function setCachedEntity(
  workspaceId: string,
  entity: Omit<CachedEntity, "cachedAt">,
): void {
  const key = cacheKey(workspaceId);
  let entries = cache.get(key) ?? [];
  entries = pruneExpired(entries);

  const normalised = entity.name.toLowerCase().trim();
  entries = entries.filter(
    (e) =>
      !(e.name.toLowerCase().trim() === normalised && e.type === entity.type),
  );

  entries.push({ ...entity, cachedAt: Date.now() });

  if (entries.length > MAX_ENTRIES_PER_WORKSPACE) {
    entries = entries.slice(-MAX_ENTRIES_PER_WORKSPACE);
  }

  cache.set(key, entries);
}

export function invalidateEntityCache(workspaceId: string): void {
  cache.delete(cacheKey(workspaceId));
}
