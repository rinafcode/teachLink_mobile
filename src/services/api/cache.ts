interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  ttl: number; // ms until stale
  staleTtl: number; // ms until evicted (stale-while-revalidate window)
  dataVersion?: string; // optional server data version tag
  sizeBytes: number; // calculated size of this entry
}

const store = new Map<string, CacheEntry<unknown>>();
let currentCacheSize = 0;
let maxCacheSizeBytes = 100 * 1024 * 1024; // 100MB default

let cacheHits = 0;
let cacheMisses = 0;

export function setMaxCacheSize(sizeBytes: number): void {
  maxCacheSizeBytes = sizeBytes;
  evictToLimit();
}

export function getCacheStats() {
  const total = cacheHits + cacheMisses;
  const hitRate = total === 0 ? 0 : cacheHits / total;
  return {
    hits: cacheHits,
    misses: cacheMisses,
    hitRate,
    sizeBytes: currentCacheSize,
    entryCount: store.size,
  };
}

export function resetCacheStats(): void {
  cacheHits = 0;
  cacheMisses = 0;
}

export function estimateSize(obj: any, visited = new Set<any>()): number {
  if (obj === null || obj === undefined) return 0;
  
  const objType = typeof obj;
  if (objType === 'number') return 8;
  if (objType === 'string') return obj.length * 2;
  if (objType === 'boolean') return 4;
  if (objType === 'symbol') return 8;
  
  if (objType === 'object') {
    if (visited.has(obj)) return 0;
    visited.add(obj);
    
    let bytes = 0;
    const objClass = Object.prototype.toString.call(obj).slice(8, -1);
    
    if (objClass === 'Array') {
      for (let i = 0; i < obj.length; i++) {
        bytes += estimateSize(obj[i], visited);
      }
    } else if (objClass === 'Object') {
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          bytes += key.length * 2;
          bytes += estimateSize(obj[key], visited);
        }
      }
    } else if (objClass === 'Date') {
      bytes += 8;
    } else {
      try {
        bytes += JSON.stringify(obj).length * 2;
      } catch {
        bytes += 100;
      }
    }
    visited.delete(obj);
    return bytes;
  }
  
  return 0;
}

function evictToLimit(): void {
  while (currentCacheSize > maxCacheSizeBytes && store.size > 0) {
    const oldestKey = store.keys().next().value;
    if (oldestKey !== undefined) {
      const entry = store.get(oldestKey);
      if (entry) {
        currentCacheSize -= entry.sizeBytes;
      }
      store.delete(oldestKey);
    } else {
      break;
    }
  }
}

function isStale<T>(entry: CacheEntry<T>): boolean {
  return Date.now() - entry.cachedAt > entry.ttl;
}

function isExpired<T>(entry: CacheEntry<T>): boolean {
  return Date.now() - entry.cachedAt > entry.staleTtl;
}

export function getCache<T>(key: string): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) {
    cacheMisses++;
    return null;
  }
  if (isExpired(entry)) {
    cacheMisses++;
    currentCacheSize -= entry.sizeBytes;
    store.delete(key);
    return null;
  }
  
  cacheHits++;
  
  // LRU behavior: move to the end of the Map
  store.delete(key);
  store.set(key, entry as CacheEntry<unknown>);
  
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
  dataVersion?: string
): void {
  const existing = store.get(key);
  if (existing) {
    currentCacheSize -= existing.sizeBytes;
    store.delete(key);
  }

  const dataSize = estimateSize(data);
  const sizeBytes = dataSize + (key.length * 2) + 128; // approx 128 bytes metadata overhead

  const entry: CacheEntry<T> = {
    data,
    cachedAt: Date.now(),
    ttl,
    staleTtl,
    dataVersion,
    sizeBytes,
  };

  store.set(key, entry as CacheEntry<unknown>);
  currentCacheSize += sizeBytes;

  evictToLimit();
}

export function invalidateCache(key: string): void {
  const entry = store.get(key);
  if (entry) {
    currentCacheSize -= entry.sizeBytes;
    store.delete(key);
  }
}

/**
 * Removes all in-memory cache entries that were stored with the given
 * dataVersion. Useful when the server signals that a specific data version
 * is no longer valid.
 */
export function invalidateCacheByDataVersion(version: string): void {
  for (const [key, entry] of store) {
    if (entry.dataVersion === version) {
      currentCacheSize -= entry.sizeBytes;
      store.delete(key);
    }
  }
}

export function clearCache(): void {
  store.clear();
  currentCacheSize = 0;
}

/**
 * Stale-while-revalidate fetch helper.
 *
 * - Returns cached data immediately if available (even if stale).
 * - Triggers a background revalidation when the entry is stale.
 * - Falls back to a fresh fetch when no cache entry exists.
 *
 * @param key         Cache key
 * @param fetcher     Async function that fetches fresh data
 * @param ttl         Time (ms) before data is considered stale (default 60 s)
 * @param staleTtl    Time (ms) before stale data is evicted (default 5 min)
 * @param dataVersion Optional server data version tag for this entry
 */
export async function fetchWithSWR<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = 60_000,
  staleTtl = 300_000,
  dataVersion?: string
): Promise<T> {
  const cached = getCache<T>(key);

  if (cached !== null) {
    if (isStaleCache(key)) {
      // Revalidate in the background; return stale data now
      fetcher()
        .then(fresh => setCache(key, fresh, ttl, staleTtl, dataVersion))
        .catch(() => {
          /* keep stale data on error */
        });
    }
    return cached;
  }

  // No cache – fetch synchronously
  const fresh = await fetcher();
  setCache(key, fresh, ttl, staleTtl, dataVersion);
  return fresh;
}

