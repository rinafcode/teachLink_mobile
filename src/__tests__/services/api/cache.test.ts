import {
  clearCache,
  getCache,
  invalidateCacheByDataVersion,
  setCache,
  setMaxCacheSize,
  getCacheStats,
  resetCacheStats,
} from '../../../services/api/cache';

beforeEach(() => {
  clearCache();
  resetCacheStats();
});

describe('invalidateCacheByDataVersion', () => {
  it('removes entries matching the given data version', () => {
    setCache('key:a', 'data-a', 60_000, 300_000, 'v2');
    setCache('key:b', 'data-b', 60_000, 300_000, 'v2');
    setCache('key:c', 'data-c', 60_000, 300_000, 'v1');

    invalidateCacheByDataVersion('v2');

    expect(getCache('key:a')).toBeNull();
    expect(getCache('key:b')).toBeNull();
    expect(getCache('key:c')).toBe('data-c');
  });

  it('leaves all entries intact when no version matches', () => {
    setCache('key:x', 'data-x', 60_000, 300_000, 'v3');

    invalidateCacheByDataVersion('v99');

    expect(getCache('key:x')).toBe('data-x');
  });

  it('handles entries with no dataVersion without throwing', () => {
    setCache('key:unversioned', 'data', 60_000, 300_000);

    expect(() => invalidateCacheByDataVersion('v1')).not.toThrow();
    expect(getCache('key:unversioned')).toBe('data');
  });
});

describe('LRU cache eviction and stats', () => {
  it('evicts least recently used items when limit is reached', () => {
    // Set size limit to 500 bytes.
    // metadata is ~128 bytes. Key 'k1' is 2 bytes. Value 'v1' is 2 bytes.
    // Total size of k1 = 4 + 2*2 + 128 = 136 bytes.
    // 3 entries will fit (3 * 136 = 408 bytes), but 4 entries (544 bytes) will exceed 500 bytes.
    setMaxCacheSize(500);

    setCache('k1', 'val1', 60_000, 300_000);
    setCache('k2', 'val2', 60_000, 300_000);
    setCache('k3', 'val3', 60_000, 300_000);

    // Verify all 3 exist
    expect(getCache('k1')).toBe('val1');
    expect(getCache('k2')).toBe('val2');
    expect(getCache('k3')).toBe('val3');

    // Add 4th item, k1 should be evicted since it's the oldest (though we accessed it,
    // getCache('k1') moved it to the end! So the order from oldest to newest after the reads:
    // k2 (oldest), k3, k1 (newest).
    // So k2 should be evicted!
    setCache('k4', 'val4', 60_000, 300_000);

    expect(getCache('k2')).toBeNull();
    expect(getCache('k1')).toBe('val1');
    expect(getCache('k3')).toBe('val3');
    expect(getCache('k4')).toBe('val4');
  });

  it('correctly tracks hits and misses stats', () => {
    resetCacheStats();
    
    // Miss
    expect(getCache('non_existent')).toBeNull();
    let stats = getCacheStats();
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBe(0);

    // Hit
    setCache('k1', 'val1', 60_000, 300_000);
    expect(getCache('k1')).toBe('val1');
    
    stats = getCacheStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBe(0.5);

    // Reset stats
    resetCacheStats();
    stats = getCacheStats();
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(0);
    expect(stats.hitRate).toBe(0);
  });
});

