import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';

import { logger } from './logger';
import { mobileAnalyticsService } from '../services/mobileAnalytics';

const CACHE_METADATA_KEY = '@image-cache-metadata';
const MAX_CACHE_SIZE_BYTES = 100 * 1024 * 1024;
/** Eviction fires when cache reaches 80% of max (80 MB) */
const EVICTION_THRESHOLD_BYTES = MAX_CACHE_SIZE_BYTES * 0.8;
const LOW_STORAGE_THRESHOLD_BYTES = 50 * 1024 * 1024;

interface CacheEntry {
  url: string;
  size: number;
  timestamp: number;
  lastAccessed: number;
  hitCount: number;
}

interface CacheMetadata {
  entries: CacheEntry[];
  totalSize: number;
}

let metadata: CacheMetadata = { entries: [], totalSize: 0 };
let metadataLoaded = false;
let cacheHits = 0;
let cacheMisses = 0;

async function loadMetadata(): Promise<void> {
  if (metadataLoaded) return;
  try {
    const stored = await AsyncStorage.getItem(CACHE_METADATA_KEY);
    if (stored) {
      metadata = JSON.parse(stored);
    }
  } catch {
    metadata = { entries: [], totalSize: 0 };
  }
  metadataLoaded = true;
}

async function saveMetadata(): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(metadata));
  } catch (err) {
    logger.warn('[ImageCache] Failed to persist metadata:', err);
  }
}

/**
 * Evict least-recently-used entries until totalSize is below targetBytes.
 * Called automatically when cache reaches EVICTION_THRESHOLD_BYTES (80 MB).
 *
 * @param targetBytes - Reduce total size to this value. Defaults to 70% of max.
 */
function evictLRU(targetBytes: number = MAX_CACHE_SIZE_BYTES * 0.7): void {
  metadata.entries.sort((a, b) => a.lastAccessed - b.lastAccessed);
  while (metadata.totalSize > targetBytes && metadata.entries.length > 0) {
    const evicted = metadata.entries.shift();
    if (evicted) {
      metadata.totalSize -= evicted.size;
      logger.debug(`[ImageCache] Evicted ${evicted.url} (${evicted.size} bytes)`);
    }
  }
}

/**
 * Check if eviction is needed (cache at or above 80% threshold) and run it.
 * Called after every prefetch write.
 */
function maybeEvict(): void {
  if (metadata.totalSize >= EVICTION_THRESHOLD_BYTES) {
    logger.warn(
      `[ImageCache] Cache at ${Math.round(metadata.totalSize / (1024 * 1024))}MB, ` +
        `triggering LRU eviction (threshold: ${Math.round(EVICTION_THRESHOLD_BYTES / (1024 * 1024))}MB)`
    );
    evictLRU();
  }
}

async function recordHit(url: string, entry: CacheEntry): Promise<void> {
  entry.hitCount++;
  entry.lastAccessed = Date.now();
  cacheHits++;
  await saveMetadata();
}

async function recordMiss(url: string): Promise<void> {
  cacheMisses++;
}

export function getCacheHitRate(): number {
  const total = cacheHits + cacheMisses;
  return total === 0 ? 0 : cacheHits / total;
}

export function getCacheStats(): {
  hitRate: number;
  totalSize: number;
  entryCount: number;
  hits: number;
  misses: number;
} {
  return {
    hitRate: getCacheHitRate(),
    totalSize: metadata.totalSize,
    entryCount: metadata.entries.length,
    hits: cacheHits,
    misses: cacheMisses,
  };
}

export class ImageCache {
  static async prefetchImages(urls: string[]): Promise<boolean[]> {
    await loadMetadata();
    const results: boolean[] = [];

    for (const url of urls) {
      const existing = metadata.entries.find(e => e.url === url);
      if (existing) {
        await recordHit(url, existing);
        results.push(true);
        continue;
      }

      try {
        const [result] = await Image.prefetch(url);
        if (result) {
          const size = await estimateImageSize(url);
          metadata.entries.push({
            url,
            size,
            timestamp: Date.now(),
            lastAccessed: Date.now(),
            hitCount: 0,
          });
          metadata.totalSize += size;
          maybeEvict();
          await saveMetadata();
          await recordMiss(url);
        }
        results.push(result);
      } catch {
        results.push(false);
      }
    }

    trackCacheAnalytics();
    return results;
  }

  static async clearCache(): Promise<void> {
    await Image.clearMemoryCache();
    await Image.clearDiskCache();
    metadata = { entries: [], totalSize: 0 };
    cacheHits = 0;
    cacheMisses = 0;
    metadataLoaded = true;
    await AsyncStorage.removeItem(CACHE_METADATA_KEY);
  }

  /**
   * Clear all non-pinned cached images. Called on critical memory pressure.
   * Preserves metadata structure but removes all entries and resets size.
   */
  static async clearNonCritical(): Promise<void> {
    await loadMetadata();
    logger.warn('[ImageCache] clearNonCritical: removing all cached image entries');
    metadata.entries = [];
    metadata.totalSize = 0;
    await Image.clearMemoryCache();
    await Image.clearDiskCache();
    await saveMetadata();
  }

  /**
   * Returns current total cache size in bytes.
   * Used by memoryPressureService to expose cache size as a metric.
   */
  static getCacheSizeBytes(): number {
    return metadata.totalSize;
  }

  /**
   * Returns the 80% eviction threshold in bytes.
   */
  static getEvictionThresholdBytes(): number {
    return EVICTION_THRESHOLD_BYTES;
  }

  static async clearMemoryCache(): Promise<void> {
    await Image.clearMemoryCache();
  }

  static async clearDiskCache(): Promise<void> {
    await Image.clearDiskCache();
    metadata = { entries: [], totalSize: 0 };
    cacheHits = 0;
    cacheMisses = 0;
    metadataLoaded = true;
    await AsyncStorage.removeItem(CACHE_METADATA_KEY);
  }

  static async cleanupOnLowStorage(): Promise<void> {
    await loadMetadata();
    const freeSpace = await getFreeDiskSpace();
    if (freeSpace !== null && freeSpace < LOW_STORAGE_THRESHOLD_BYTES) {
      logger.warn('[ImageCache] Low storage detected, clearing image cache');
      await ImageCache.clearCache();
    }
  }
}

async function estimateImageSize(url: string): Promise<number> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      return parseInt(contentLength, 10);
    }
  } catch {
    // fallback to default estimate
  }
  return 50 * 1024;
}

async function getFreeDiskSpace(): Promise<number | null> {
  try {
    const AsyncStorage_getSize = (AsyncStorage as any).getSize;
    if (typeof AsyncStorage_getSize === 'function') {
      return await AsyncStorage_getSize();
    }
  } catch {
    // not available
  }
  return null;
}

function trackCacheAnalytics(): void {
  const stats = getCacheStats();
  mobileAnalyticsService.trackEvent('image_cache_stats', {
    hitRate: stats.hitRate,
    totalSizeMB: Math.round(stats.totalSize / (1024 * 1024)),
    entryCount: stats.entryCount,
  });
}
