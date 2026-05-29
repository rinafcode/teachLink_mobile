/**
 * Tests for the in-memory cache module (cache.ts).
 * No mocks — exercises the real implementation.
 */
import {
  clearCache,
  getCache,
  invalidateCacheByDataVersion,
  setCache,
} from '../../../services/api/cache';

beforeEach(() => {
  clearCache();
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
