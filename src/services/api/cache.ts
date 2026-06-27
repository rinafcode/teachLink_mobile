import AsyncStorage from '@react-native-async-storage/async-storage';

import { AnalyticsEvent } from '../../utils/trackingEvents';
import { mobileAnalyticsService } from '../mobileAnalytics';

type CacheTier = 'memory' | 'asyncStorage';
type MutationMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface CacheOptions {
  dataVersion?: string;
  tags?: string[];
  dataType?: string;
  critical?: boolean;
}

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  ttl: number; // ms until stale
  staleTtl: number; // ms until evicted (stale-while-revalidate window)
  dataVersion?: string; // optional server data version tag
  tags: string[];
  dataType: string;
  critical: boolean;
  sizeBytes: number; // calculated size of this entry
}

interface PersistedCacheEnvelope<T> {
  schemaVersion: 1;
  key: string;
  entry: CacheEntry<T>;
}

const CACHE_STORAGE_PREFIX = '@teachlink/api-cache:';
const CACHE_ANALYTICS_INTERVAL_MS = 30_000;
const CACHE_ANALYTICS_OPERATION_INTERVAL = 10;

const store = new Map<string, CacheEntry<unknown>>();
let currentCacheSize = 0;
let maxCacheSizeBytes = 100 * 1024 * 1024; // 100MB default

let cacheHits = 0;
let cacheMisses = 0;
let memoryHits = 0;
let storageHits = 0;
let networkFetches = 0;
let backgroundRevalidations = 0;
let invalidations = 0;
let operationsSinceAnalytics = 0;
let lastAnalyticsAt = 0;

const revalidatingKeys = new Set<string>();
const cacheStatusListeners = new Set<() => void>();

export interface CacheStatus {
  key: string;
  isCached: boolean;
  isStale: boolean;
  isExpired: boolean;
  isRevalidating: boolean;
  ageMs: number | null;
  cachedAt: number | null;
  ttlMs: number | null;
  staleTtlMs: number | null;
}

function storageKeyFor(key: string): string {
  return `${CACHE_STORAGE_PREFIX}${encodeURIComponent(key)}`;
}

function normalizeOptions(options?: string | CacheOptions): Required<CacheOptions> {
  if (typeof options === 'string') {
    return {
      dataVersion: options,
      tags: [],
      dataType: 'generic',
      critical: false,
    };
  }

  return {
    dataVersion: options?.dataVersion,
    tags: options?.tags ?? [],
    dataType: options?.dataType ?? 'generic',
    critical: options?.critical ?? false,
  };
}

export function setMaxCacheSize(sizeBytes: number): void {
  maxCacheSizeBytes = sizeBytes;
  evictToLimit();
}

export function getCacheStats() {
  const totalLookups = cacheHits + cacheMisses;
  const hitRate = totalLookups === 0 ? 0 : cacheHits / totalLookups;
  const totalFetchOpportunities = cacheHits + networkFetches;
  const networkReductionRate =
    totalFetchOpportunities === 0 ? 0 : cacheHits / totalFetchOpportunities;

  return {
    hits: cacheHits,
    misses: cacheMisses,
    hitRate,
    memoryHits,
    storageHits,
    networkFetches,
    backgroundRevalidations,
    invalidations,
    networkReductionRate,
    sizeBytes: currentCacheSize,
    entryCount: store.size,
  };
}

export function resetCacheStats(): void {
  cacheHits = 0;
  cacheMisses = 0;
  memoryHits = 0;
  storageHits = 0;
  networkFetches = 0;
  backgroundRevalidations = 0;
  invalidations = 0;
  operationsSinceAnalytics = 0;
  lastAnalyticsAt = 0;
}

function notifyCacheStatusListeners(): void {
  cacheStatusListeners.forEach(listener => {
    try {
      listener();
    } catch {
      // Swallow listener errors so cache updates stay resilient.
    }
  });
}

function setRevalidatingState(key: string, isRevalidating: boolean): void {
  if (isRevalidating) {
    const changed = revalidatingKeys.size === 0 || !revalidatingKeys.has(key);
    revalidatingKeys.add(key);
    if (changed) {
      notifyCacheStatusListeners();
    }
    return;
  }

  const hadKey = revalidatingKeys.delete(key);
  if (hadKey) {
    notifyCacheStatusListeners();
  }
}

export function subscribeToCacheStatus(listener: () => void): () => void {
  cacheStatusListeners.add(listener);
  return () => {
    cacheStatusListeners.delete(listener);
  };
}

export function getRevalidatingCacheKeys(): string[] {
  return Array.from(revalidatingKeys);
}

export function getCacheStatus(key: string): CacheStatus {
  const entry = store.get(key);
  if (!entry) {
    return {
      key,
      isCached: false,
      isStale: false,
      isExpired: false,
      isRevalidating: revalidatingKeys.has(key),
      ageMs: null,
      cachedAt: null,
      ttlMs: null,
      staleTtlMs: null,
    };
  }

  return {
    key,
    isCached: true,
    isStale: isStale(entry),
    isExpired: isExpired(entry),
    isRevalidating: revalidatingKeys.has(key),
    ageMs: Date.now() - entry.cachedAt,
    cachedAt: entry.cachedAt,
    ttlMs: entry.ttl,
    staleTtlMs: entry.staleTtl,
  };
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
      removeMemoryEntry(oldestKey);
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

function removeMemoryEntry(key: string): boolean {
  const entry = store.get(key);
  if (!entry) {
    return false;
  }

  currentCacheSize -= entry.sizeBytes;
  store.delete(key);
  return true;
}

function putMemoryEntry<T>(key: string, entry: CacheEntry<T>): void {
  removeMemoryEntry(key);
  store.set(key, entry as CacheEntry<unknown>);
  currentCacheSize += entry.sizeBytes;
  evictToLimit();
}

function getMemoryEntry<T>(key: string): CacheEntry<T> | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) {
    return null;
  }

  if (isExpired(entry)) {
    removeMemoryEntry(key);
    void removePersistentCache(key);
    return null;
  }

  // LRU behavior: move to the end of the Map
  store.delete(key);
  store.set(key, entry as CacheEntry<unknown>);

  return entry;
}

function recordHit(tier: CacheTier): void {
  cacheHits++;
  if (tier === 'memory') {
    memoryHits++;
  } else {
    storageHits++;
  }
  maybeReportCacheStats(`hit:${tier}`);
}

function recordMiss(): void {
  cacheMisses++;
  maybeReportCacheStats('miss');
}

function recordNetworkFetch(): void {
  networkFetches++;
  maybeReportCacheStats('network');
}

function maybeReportCacheStats(reason: string): void {
  operationsSinceAnalytics++;

  const now = Date.now();
  if (
    operationsSinceAnalytics < CACHE_ANALYTICS_OPERATION_INTERVAL &&
    now - lastAnalyticsAt < CACHE_ANALYTICS_INTERVAL_MS
  ) {
    return;
  }

  operationsSinceAnalytics = 0;
  lastAnalyticsAt = now;

  const stats = getCacheStats();
  mobileAnalyticsService.trackEvent(AnalyticsEvent.PERFORMANCE_METRIC, {
    event_category: 'high_frequency',
    event_name: 'api_cache_metrics',
    metric_name: 'api_cache_hit_rate',
    metric_value: Math.round(stats.hitRate * 100),
    cache_reason: reason,
    cache_hits: stats.hits,
    cache_misses: stats.misses,
    cache_memory_hits: stats.memoryHits,
    cache_storage_hits: stats.storageHits,
    cache_network_fetches: stats.networkFetches,
    cache_hit_rate_pct: Math.round(stats.hitRate * 100),
    cache_network_reduction_pct: Math.round(stats.networkReductionRate * 100),
  });
}

async function persistCacheEntry<T>(key: string, entry: CacheEntry<T>): Promise<void> {
  try {
    const envelope: PersistedCacheEnvelope<T> = {
      schemaVersion: 1,
      key,
      entry,
    };
    await AsyncStorage.setItem(storageKeyFor(key), JSON.stringify(envelope));
  } catch {
    // Some response bodies may not be serializable. Keep the memory tier.
  }
}

async function readPersistentCache<T>(key: string): Promise<CacheEntry<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKeyFor(key));
    if (!raw) {
      return null;
    }

    const envelope = JSON.parse(raw) as PersistedCacheEnvelope<T>;
    if (envelope.schemaVersion !== 1 || envelope.key !== key || !envelope.entry) {
      await removePersistentCache(key);
      return null;
    }

    if (isExpired(envelope.entry)) {
      await removePersistentCache(key);
      return null;
    }

    return envelope.entry;
  } catch {
    await removePersistentCache(key);
    return null;
  }
}

async function removePersistentCache(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(storageKeyFor(key));
  } catch {
    /* ignore storage cleanup errors */
  }
}

async function getPersistentCacheKeys(): Promise<string[]> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    return keys.filter(key => key.startsWith(CACHE_STORAGE_PREFIX));
  } catch {
    return [];
  }
}

async function invalidatePersistentWhere(
  predicate: (key: string, entry: CacheEntry<unknown>) => boolean
): Promise<void> {
  const keys = await getPersistentCacheKeys();

  await Promise.all(
    keys.map(async storageKey => {
      const encodedKey = storageKey.slice(CACHE_STORAGE_PREFIX.length);
      const cacheKey = decodeURIComponent(encodedKey);
      const entry = await readPersistentCache(cacheKey);
      if (entry && predicate(cacheKey, entry as CacheEntry<unknown>)) {
        await AsyncStorage.removeItem(storageKey);
      }
    })
  );
}

export async function clearPersistentCache(): Promise<void> {
  const keys = await getPersistentCacheKeys();
  await Promise.all(keys.map(key => AsyncStorage.removeItem(key)));
}

export function getCache<T>(key: string): T | null {
  const entry = getMemoryEntry<T>(key);
  if (!entry) {
    cacheMisses++;
    return null;
  }

  cacheHits++;
  memoryHits++;
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
  dataVersionOrOptions?: string | CacheOptions
): void {
  const options = normalizeOptions(dataVersionOrOptions);
  const dataSize = estimateSize(data);
  const sizeBytes = dataSize + key.length * 2 + 128; // approx 128 bytes metadata overhead

  const entry: CacheEntry<T> = {
    data,
    cachedAt: Date.now(),
    ttl,
    staleTtl,
    dataVersion: options.dataVersion,
    tags: options.tags,
    dataType: options.dataType,
    critical: options.critical,
    sizeBytes,
  };

  putMemoryEntry(key, entry);
  setRevalidatingState(key, false);
  void persistCacheEntry(key, entry);
}

export function invalidateCache(key: string): void {
  if (removeMemoryEntry(key)) {
    invalidations++;
  }
  setRevalidatingState(key, false);
  void removePersistentCache(key);
}

export function invalidateCacheByPrefix(prefix: string): number {
  let removed = 0;

  for (const key of Array.from(store.keys())) {
    if (key.startsWith(prefix) && removeMemoryEntry(key)) {
      removed++;
    }
  }

  if (removed > 0) {
    invalidations += removed;
    maybeReportCacheStats('invalidate:prefix');
  }

  void invalidatePersistentWhere(key => key.startsWith(prefix));
  return removed;
}

export function invalidateCacheByTags(tags: string[]): number {
  if (tags.length === 0) {
    return 0;
  }

  const tagSet = new Set(tags);
  let removed = 0;

  for (const [key, entry] of Array.from(store.entries())) {
    if (entry.tags.some(tag => tagSet.has(tag)) && removeMemoryEntry(key)) {
      removed++;
    }
  }

  if (removed > 0) {
    invalidations += removed;
    maybeReportCacheStats('invalidate:tags');
  }

  void invalidatePersistentWhere((_key, entry) => entry.tags.some(tag => tagSet.has(tag)));
  return removed;
}

/**
 * Removes all cache entries that were stored with the given dataVersion.
 * Useful when the server signals that a specific data version is no longer valid.
 */
export function invalidateCacheByDataVersion(version: string): void {
  let removed = 0;

  for (const [key, entry] of Array.from(store.entries())) {
    if (entry.dataVersion === version && removeMemoryEntry(key)) {
      removed++;
    }
  }

  if (removed > 0) {
    invalidations += removed;
    maybeReportCacheStats('invalidate:version');
  }

  void invalidatePersistentWhere((_key, entry) => entry.dataVersion === version);
}

export function invalidateCacheForMutation(
  method: string | undefined,
  url: string | undefined
): number {
  const normalizedMethod = method?.toUpperCase() as MutationMethod | undefined;
  if (!normalizedMethod || !['POST', 'PUT', 'PATCH', 'DELETE'].includes(normalizedMethod)) {
    return 0;
  }

  const path = normalizePath(url);
  if (!path) {
    return 0;
  }

  const tags = tagsForMutationPath(path);
  return invalidateCacheByTags(tags);
}

export function invalidateCacheForBatchRequests(requests: unknown): number {
  const parsedRequests = parseBatchRequests(requests);
  return parsedRequests.reduce(
    (count, request) => count + invalidateCacheForMutation(request.method, request.url),
    0
  );
}

function normalizePath(url?: string): string {
  if (!url) {
    return '';
  }

  try {
    const parsed = new URL(url, 'https://teachlink.local');
    return parsed.pathname.replace(/^\/api\//, '/');
  } catch {
    return url.split('?')[0].replace(/^\/api\//, '/');
  }
}

function tagsForMutationPath(path: string): string[] {
  const parts = path.split('/').filter(Boolean);
  const [resource, id] = parts;

  if (!resource) {
    return [];
  }

  if (resource === 'courses') {
    return id ? ['courses', `course:${id}`] : ['courses'];
  }

  if (resource === 'users') {
    return id ? ['users', `user:${id}`] : ['users'];
  }

  return [resource, `resource:${resource}`];
}

function parseBatchRequests(requests: unknown): { method?: string; url?: string }[] {
  let value = requests;

  if (typeof requests === 'string') {
    try {
      value = JSON.parse(requests);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(item => item && typeof item === 'object')
    .map(item => item as { method?: string; url?: string });
}

export function clearCache(): void {
  store.clear();
  currentCacheSize = 0;
  revalidatingKeys.clear();
  notifyCacheStatusListeners();
  void clearPersistentCache();
}

async function getTieredEntry<T>(key: string): Promise<CacheEntry<T> | null> {
  const memoryEntry = getMemoryEntry<T>(key);
  if (memoryEntry) {
    recordHit('memory');
    return memoryEntry;
  }

  const persistedEntry = await readPersistentCache<T>(key);
  if (persistedEntry) {
    putMemoryEntry(key, persistedEntry);
    recordHit('asyncStorage');
    return persistedEntry;
  }

  recordMiss();
  return null;
}

/**
 * Stale-while-revalidate fetch helper.
 *
 * - Checks memory first.
 * - Falls back to AsyncStorage when memory is cold.
 * - Fetches from the network only when both local tiers miss or are expired.
 * - Returns stale data during the stale window while revalidating in the background.
 *
 * @param key         Cache key
 * @param fetcher     Async function that fetches fresh data
 * @param ttl         Time (ms) before data is considered stale (default 60 s)
 * @param staleTtl    Time (ms) before stale data is evicted (default 5 min)
 * @param options     Optional data version, tags, data type, and critical flag
 */
export async function fetchWithSWR<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = 60_000,
  staleTtl = 300_000,
  options?: string | CacheOptions
): Promise<T> {
  const normalizedOptions = normalizeOptions(options);
  const memoryEntry = getMemoryEntry<T>(key);

  if (memoryEntry !== null) {
    if (isStale(memoryEntry)) {
      backgroundRevalidations++;
      setRevalidatingState(key, true);
      fetcher()
        .then(fresh => {
          recordNetworkFetch();
          setCache(key, fresh, ttl, staleTtl, normalizedOptions);
        })
        .catch(() => {
          setRevalidatingState(key, false);
          /* keep stale data on error */
        });
    }
    return memoryEntry.data;
  }

  const cached = await getTieredEntry<T>(key);

  if (cached !== null) {
    if (isStale(cached)) {
      backgroundRevalidations++;
      setRevalidatingState(key, true);
      fetcher()
        .then(fresh => {
          recordNetworkFetch();
          setCache(key, fresh, ttl, staleTtl, normalizedOptions);
        })
        .catch(() => {
          setRevalidatingState(key, false);
          /* keep stale data on error */
        });
    }
    return cached.data;
  }

  const fresh = await fetcher();
  recordNetworkFetch();
  setCache(key, fresh, ttl, staleTtl, normalizedOptions);
  return fresh;
}
