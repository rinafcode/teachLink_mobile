interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  ttl: number;       // ms until stale
  staleTtl: number;  // ms until evicted (stale-while-revalidate window)
}

const store = new Map<string, CacheEntry<unknown>>();

function isStale<T>(entry: CacheEntry<T>): boolean {
  return Date.now() - entry.cachedAt > entry.ttl;
}

function isExpired<T>(entry: CacheEntry<T>): boolean {
  return Date.now() - entry.cachedAt > entry.staleTtl;
}

export function getCache<T>(key: string): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry || isExpired(entry)) return null;
  return entry.data;
}

export function isStaleCache(key: string): boolean {
  const entry = store.get(key);
  if (!entry) return false;
  return isStale(entry);
}

export function setCache<T>(
  key: string,
  data: T,
  ttl: number,
  staleTtl: number,
): void {
  store.set(key, { data, cachedAt: Date.now(), ttl, staleTtl });
}

export function invalidateCache(key: string): void {
  store.delete(key);
}

export function clearCache(): void {
  store.clear();
}

/**
 * Stale-while-revalidate fetch helper.
 *
 * - Returns cached data immediately if available (even if stale).
 * - Triggers a background revalidation when the entry is stale.
 * - Falls back to a fresh fetch when no cache entry exists.
 *
 * @param key       Cache key
 * @param fetcher   Async function that fetches fresh data
 * @param ttl       Time (ms) before data is considered stale (default 60 s)
 * @param staleTtl  Time (ms) before stale data is evicted (default 5 min)
 */
export async function fetchWithSWR<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = 60_000,
  staleTtl = 300_000,
): Promise<T> {
  const cached = getCache<T>(key);

  if (cached !== null) {
    if (isStaleCache(key)) {
      // Revalidate in the background; return stale data now
      fetcher()
        .then((fresh) => setCache(key, fresh, ttl, staleTtl))
        .catch(() => {/* keep stale data on error */});
    }
    return cached;
  }

  // No cache – fetch synchronously
  const fresh = await fetcher();
  setCache(key, fresh, ttl, staleTtl);
  return fresh;
}
