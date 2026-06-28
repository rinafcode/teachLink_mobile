/**
 * Unit tests for imageCache LRU eviction — issue #677.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';

import { ImageCache, getCacheStats } from '../../utils/imageCache';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-image', () => ({
  Image: {
    prefetch: jest.fn().mockResolvedValue([true]),
    clearMemoryCache: jest.fn().mockResolvedValue(undefined),
    clearDiskCache: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../services/mobileAnalytics', () => ({
  mobileAnalyticsService: { trackEvent: jest.fn() },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

global.fetch = jest.fn() as any;

// ── Constants ─────────────────────────────────────────────────────────────────

const ONE_MB = 1024 * 1024;
const MAX_CACHE_BYTES = 100 * ONE_MB;
const EVICTION_THRESHOLD = MAX_CACHE_BYTES * 0.8;

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeFetchWithSize(sizeBytes: number) {
  return jest.fn().mockResolvedValue({
    headers: {
      get: (key: string) => (key === 'content-length' ? String(sizeBytes) : null),
    },
  });
}

function seedMetadata(entries: { url: string; sizeMB: number; lastAccessedOffset?: number }[]) {
  const now = Date.now();
  const built = entries.map(({ url, sizeMB, lastAccessedOffset = 0 }, i) => ({
    url,
    size: sizeMB * ONE_MB,
    timestamp: now - 10000 + i,
    lastAccessed: now + lastAccessedOffset,
    hitCount: 0,
  }));
  const totalSize = built.reduce((sum, e) => sum + e.size, 0);
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
    JSON.stringify({ entries: built, totalSize })
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ImageCache LRU eviction — issue #677', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    // Reset cache between tests
    await ImageCache.clearCache();
  });

  it('eviction threshold constant is 80% of 100 MB', () => {
    expect(ImageCache.getEvictionThresholdBytes()).toBe(EVICTION_THRESHOLD);
  });

  it('getCacheSizeBytes returns 0 on empty cache', async () => {
    await ImageCache.prefetchImages([]);
    expect(ImageCache.getCacheSizeBytes()).toBe(0);
  });

  it('eviction fires when cache exceeds 80 MB threshold', async () => {
    // Seed 80 MB (at threshold)
    seedMetadata(
      Array.from({ length: 80 }, (_, i) => ({
        url: `https://example.com/img${i}.jpg`,
        sizeMB: 1,
        lastAccessedOffset: i * 100,
      }))
    );

    global.fetch = makeFetchWithSize(ONE_MB);
    (Image.prefetch as jest.Mock).mockResolvedValue([true]);

    // Push 1 more MB — crosses 80 MB threshold → eviction fires
    await ImageCache.prefetchImages(['https://example.com/new.jpg']);

    expect(ImageCache.getCacheSizeBytes()).toBeLessThanOrEqual(MAX_CACHE_BYTES);
    // After eviction, should be below threshold
    expect(ImageCache.getCacheSizeBytes()).toBeLessThan(EVICTION_THRESHOLD + ONE_MB);
  });

  it('clearNonCritical removes all entries and resets size to 0', async () => {
    seedMetadata([
      { url: 'https://example.com/a.jpg', sizeMB: 10 },
      { url: 'https://example.com/b.jpg', sizeMB: 20 },
    ]);

    // Load metadata by calling prefetch with no new urls
    await ImageCache.prefetchImages([]);

    await ImageCache.clearNonCritical();

    expect(ImageCache.getCacheSizeBytes()).toBe(0);
    expect(getCacheStats().entryCount).toBe(0);
  });

  it('getCacheSizeBytes returns correct total after single prefetch', async () => {
    global.fetch = makeFetchWithSize(5 * ONE_MB);
    (Image.prefetch as jest.Mock).mockResolvedValue([true]);

    await ImageCache.prefetchImages(['https://example.com/test.jpg']);

    expect(ImageCache.getCacheSizeBytes()).toBe(5 * ONE_MB);
  });

  it('cache does not exceed 100 MB after many prefetches', async () => {
    global.fetch = makeFetchWithSize(10 * ONE_MB);
    (Image.prefetch as jest.Mock).mockResolvedValue([true]);

    const urls = Array.from({ length: 15 }, (_, i) => `https://example.com/big${i}.jpg`);

    await ImageCache.prefetchImages(urls);

    expect(ImageCache.getCacheSizeBytes()).toBeLessThanOrEqual(MAX_CACHE_BYTES);
  });
});
