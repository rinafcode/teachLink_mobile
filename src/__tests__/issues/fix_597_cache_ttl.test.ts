/**
 * Unit tests for Issue #597 — per-endpoint SWR cache TTL + pattern invalidation.
 */

import {
  DEFAULT_ENDPOINT_TTL,
  ENDPOINT_TTL_MAP,
  MUTATION_INVALIDATION_MAP,
  resolveEndpointTtl,
} from '../../config/apiCacheConfig';
import { clearCache, getCache, invalidatePattern, setCache } from '../../services/api/cache';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
  getAllKeys: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../services/mobileAnalytics', () => ({
  mobileAnalyticsService: { trackEvent: jest.fn() },
}));

const THIRTY_SECONDS = 30_000;
const FIVE_MINUTES = 5 * 60_000;

describe('Issue #597 — per-endpoint TTL configuration', () => {
  it('applies a 30s TTL to critical endpoints', () => {
    for (const url of ['/subscriptions', '/auth/me', '/payments']) {
      expect(resolveEndpointTtl(url).ttl).toBe(THIRTY_SECONDS);
    }
  });

  it('applies a 5min TTL to static endpoints', () => {
    for (const url of ['/courses', '/categories']) {
      expect(resolveEndpointTtl(url).ttl).toBe(FIVE_MINUTES);
    }
  });

  it('confirms different TTL values are applied per endpoint', () => {
    const subscriptions = resolveEndpointTtl('/subscriptions').ttl;
    const courses = resolveEndpointTtl('/courses').ttl;

    expect(subscriptions).toBe(THIRTY_SECONDS);
    expect(courses).toBe(FIVE_MINUTES);
    expect(subscriptions).not.toBe(courses);
  });

  it('never serves critical data past its TTL (staleTtl === ttl)', () => {
    const { ttl, staleTtl } = ENDPOINT_TTL_MAP['/subscriptions'];
    expect(staleTtl).toBe(ttl);
  });

  it('falls back to the global default for unconfigured endpoints', () => {
    expect(resolveEndpointTtl('/quizzes/123/answers')).toEqual(DEFAULT_ENDPOINT_TTL);
  });

  it('normalizes URLs (api prefix, query string, nested paths)', () => {
    expect(resolveEndpointTtl('/api/subscriptions?plan=pro').ttl).toBe(THIRTY_SECONDS);
    expect(resolveEndpointTtl('api:/subscriptions/123').ttl).toBe(THIRTY_SECONDS);
    expect(resolveEndpointTtl('https://x.test/api/courses').ttl).toBe(FIVE_MINUTES);
  });
});

describe('Issue #597 — pattern-based invalidation', () => {
  beforeEach(() => {
    clearCache();
  });

  it('invalidatePattern removes only matching cache entries', () => {
    setCache('api:/subscriptions', { plan: 'pro' }, THIRTY_SECONDS, THIRTY_SECONDS);
    setCache('api:/courses', [{ id: '1' }], FIVE_MINUTES, FIVE_MINUTES);

    const removed = invalidatePattern(/\/subscriptions/);

    expect(removed).toBe(1);
    expect(getCache('api:/subscriptions')).toBeNull();
    expect(getCache('api:/courses')).not.toBeNull();
  });

  it('a POST to /subscriptions invalidates the /subscriptions GET cache', () => {
    setCache('api:/subscriptions', { plan: 'free' }, THIRTY_SECONDS, THIRTY_SECONDS);

    const rule = MUTATION_INVALIDATION_MAP.find(
      r => r.methods.includes('POST') && r.urlPattern.test('/api/subscriptions')
    );
    expect(rule).toBeDefined();

    // Mirror the axios response interceptor: run every invalidate pattern.
    rule!.invalidatePatterns.forEach(pattern => invalidatePattern(pattern));

    expect(getCache('api:/subscriptions')).toBeNull();
  });
});
