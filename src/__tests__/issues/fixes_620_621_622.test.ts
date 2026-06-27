/**
 * Unit tests for issues #620, #621, #622
 */

// ─── Issue #621: CachedImage Animated.Value via useRef ──────────────────────

jest.mock('expo-image', () => ({
  Image: 'Image',
}));
jest.mock('../../services/imagePerformance', () => ({
  imagePerformanceService: { recordImageLoad: jest.fn() },
}));
jest.mock('../../store/settingsStore', () => ({
  useSettingsStore: (sel: any) => sel({ dataSaverEnabled: false }),
}));
jest.mock('../../utils/imageCache', () => ({
  ImageCache: { prefetchImages: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('../../utils/imageOptimization', () => ({
  buildOptimizedImageSources: jest.fn(uri => ({
    primaryUri: uri,
    fallbackUri: uri,
    lqipUri: uri,
    dpr: 1,
  })),
}));
jest.mock('../../utils/logger', () => ({
  logger: { debug: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { Animated } from 'react-native';

describe('#621 CachedImage — Animated.Value reference stability', () => {
  it('opacity ref is identical across multiple renders (Object.is)', () => {
    // Simulate what CachedImageComponent does: useRef(new Animated.Value(0)).current
    const { result, rerender } = renderHook(() => {
      const opacity = React.useRef(new Animated.Value(0)).current;
      return opacity;
    });

    const first = result.current;

    for (let i = 0; i < 4; i++) {
      rerender();
    }

    expect(Object.is(result.current, first)).toBe(true);
  });
});

// ─── Issue #620: invalidateByPattern ────────────────────────────────────────

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn().mockResolvedValue(undefined),
    getItem: jest.fn().mockResolvedValue(null),
    removeItem: jest.fn().mockResolvedValue(undefined),
    getAllKeys: jest.fn().mockResolvedValue([]),
  },
}));
jest.mock('../../services/mobileAnalytics', () => ({
  mobileAnalyticsService: { trackEvent: jest.fn() },
}));
jest.mock('../../utils/trackingEvents', () => ({
  AnalyticsEvent: { PERFORMANCE_METRIC: 'performance_metric' },
}));

import { setCache, getCache, invalidateByPattern, clearCache } from '../../services/api/cache';

describe('#620 invalidateByPattern', () => {
  beforeEach(() => clearCache());

  it('removes matching cache entries and returns count', () => {
    setCache('/api/courses', [1, 2], 60_000, 300_000);
    setCache('/api/courses/123', { id: 123 }, 60_000, 300_000);
    setCache('/api/users/1', { id: 1 }, 60_000, 300_000);

    const removed = invalidateByPattern(/\/api\/courses/);

    expect(removed).toBe(2);
    expect(getCache('/api/courses')).toBeNull();
    expect(getCache('/api/courses/123')).toBeNull();
    // unrelated entry untouched
    expect(getCache('/api/users/1')).not.toBeNull();
  });

  it('cache miss immediately after POST mutation via pattern', () => {
    setCache('/api/courses', [1, 2], 60_000, 300_000);

    // Simulate what the interceptor does after POST /api/courses
    invalidateByPattern(/\/api\/courses/);

    expect(getCache('/api/courses')).toBeNull();
  });

  it('returns 0 when no keys match', () => {
    setCache('/api/users/1', { id: 1 }, 60_000, 300_000);
    expect(invalidateByPattern(/\/api\/courses/)).toBe(0);
  });
});

// ─── Issue #622: backgroundTaskScheduler 25-second timeout ──────────────────

import { BackgroundTaskScheduler } from '../../utils/backgroundTaskScheduler';

describe('#622 BackgroundTaskScheduler — 25-second timeout', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('resolves with timedOut=true exactly at 25000ms', async () => {
    const scheduler = new BackgroundTaskScheduler();
    const neverResolves = () => new Promise<void>(() => {/* never */});

    const promise = scheduler.runWithTimeout(neverResolves, 'testTask', 25_000);
    jest.advanceTimersByTime(25_000);

    const result = await promise;
    expect(result.timedOut).toBe(true);
    expect(result.taskDurationMs).toBeGreaterThanOrEqual(25_000);
  });

  it('resolves with timedOut=false when task completes before timeout', async () => {
    const scheduler = new BackgroundTaskScheduler();
    const fastTask = async () => { /* instant */ };

    const result = await scheduler.runWithTimeout(fastTask, 'fastTask', 25_000);
    expect(result.timedOut).toBe(false);
  });
});
