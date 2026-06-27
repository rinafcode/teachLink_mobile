import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { InteractionManager } from 'react-native';

import { usePrefetchImages } from '../../hooks/usePrefetchImages';
import { memoryPressureService } from '../../services/memoryPressureService';
import { useDeviceStore } from '../../store/deviceStore';
import { useSettingsStore } from '../../store/settingsStore';
import { ImageCache } from '../../utils/imageCache';
import { appLogger } from '../../utils/logger';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('expo-image', () => ({
  Image: {
    prefetch: jest.fn(() => Promise.resolve(true)),
    clearMemoryCache: jest.fn(() => Promise.resolve()),
    clearDiskCache: jest.fn(() => Promise.resolve()),
  },
}));

const mockNetInfoFetch = jest.fn();
let netInfoListener: (state: any) => void;

jest.mock('@react-native-community/netinfo', () => ({
  fetch: (...args: unknown[]) => mockNetInfoFetch(...args),
  addEventListener: jest.fn(cb => {
    netInfoListener = cb;
    return jest.fn();
  }),
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  appLogger: {
    debugSync: jest.fn(),
    infoSync: jest.fn(),
    warnSync: jest.fn(),
    errorSync: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  default: {
    debugSync: jest.fn(),
  },
}));

jest.mock('../../services/memoryPressureService', () => ({
  memoryPressureService: {
    isUnderPressure: jest.fn(() => false),
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WIFI_STATE = { isConnected: true, type: 'wifi', details: { isConnectionExpensive: false } };
const WIFI_EXPENSIVE_STATE = {
  isConnected: true,
  type: 'wifi',
  details: { isConnectionExpensive: true },
};
const CELLULAR_STATE = {
  isConnected: true,
  type: 'cellular',
  details: { isConnectionExpensive: false },
};
const OFFLINE_STATE = { isConnected: false, type: 'none', details: null };

const URLS = [
  'https://cdn.example.com/img1.jpg',
  'https://cdn.example.com/img2.jpg',
  'https://cdn.example.com/img3.jpg',
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('usePrefetchImages — issue #233', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Default: running InteractionManager callbacks immediately
    (InteractionManager.runAfterInteractions as jest.Mock).mockImplementation(cb => {
      cb();
      return { cancel: jest.fn() };
    });

    mockNetInfoFetch.mockResolvedValue(WIFI_STATE);

    // Ensure stores are in a clean state
    useSettingsStore.setState({ dataSaverEnabled: false });
    useDeviceStore.setState({ isLowBattery: false });
    (memoryPressureService.isUnderPressure as jest.Mock).mockReturnValue(false);

    // AsyncStorage default: no stored preference
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ─── Basic smoke test ───────────────────────────────────────────────────

  it('returns correct initial state', () => {
    const { result } = renderHook(() => usePrefetchImages([], { auto: false }));

    expect(result.current.isPrefetching).toBe(false);
    expect(result.current.failedUrls).toEqual([]);
    expect(result.current.hitRate).toBe(0);
    expect(typeof result.current.prefetch).toBe('function');
    expect(typeof result.current.clearCache).toBe('function');
    expect(typeof result.current.recordHit).toBe('function');
  });

  it('prefetches when on Wi-Fi normally', async () => {
    mockNetInfoFetch.mockResolvedValue(WIFI_STATE);
    const prefetchSpy = jest.spyOn(ImageCache, 'prefetchImages').mockResolvedValue([true, true]);

    renderHook(() => usePrefetchImages(URLS, { auto: true, aggressiveness: 'aggressive' }));

    act(() => {
      netInfoListener(WIFI_STATE);
    });

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    await waitFor(() => {
      expect(prefetchSpy).toHaveBeenCalled();
    });
  });

  it('completely disables prefetch when isConnectionExpensive is true', async () => {
    mockNetInfoFetch.mockResolvedValue(WIFI_EXPENSIVE_STATE);
    const prefetchSpy = jest.spyOn(ImageCache, 'prefetchImages');

    const { result } = renderHook(() =>
      usePrefetchImages(URLS, { auto: false, aggressiveness: 'aggressive' })
    );

    act(() => {
      netInfoListener(WIFI_EXPENSIVE_STATE);
    });

    await act(async () => {
      await result.current.prefetch(URLS);
    });

    expect(prefetchSpy).not.toHaveBeenCalled();
    expect(appLogger.debugSync).toHaveBeenCalledWith(
      'usePrefetchImages: skipped — network logic (off or expensive)'
    );
  });

  it('caps aggressiveness to conservative when on cellular connection', async () => {
    mockNetInfoFetch.mockResolvedValue(CELLULAR_STATE);
    const prefetchSpy = jest
      .spyOn(ImageCache, 'prefetchImages')
      .mockResolvedValue([true, true, true]);

    renderHook(() => usePrefetchImages(URLS, { auto: true, aggressiveness: 'aggressive' }));

    act(() => {
      netInfoListener(CELLULAR_STATE);
    });

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    expect(prefetchSpy).toHaveBeenCalled();

    expect(appLogger.debugSync).toHaveBeenCalledWith(
      'usePrefetchImages: prefetch start',
      expect.objectContaining({ aggressiveness: 'conservative' })
    );
  });

  it('skips prefetch when offline', async () => {
    mockNetInfoFetch.mockResolvedValue(OFFLINE_STATE);
    const prefetchSpy = jest.spyOn(ImageCache, 'prefetchImages');

    renderHook(() => usePrefetchImages(URLS, { auto: true }));

    act(() => {
      netInfoListener(OFFLINE_STATE);
    });

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    expect(prefetchSpy).not.toHaveBeenCalled();
  });

  it('cancels active prefetch when network degrades to expensive (abort controller)', async () => {
    mockNetInfoFetch.mockResolvedValue(WIFI_STATE);

    let resolvePrefetch: any;
    const promise = new Promise(resolve => {
      resolvePrefetch = resolve;
    });
    jest.spyOn(ImageCache, 'prefetchImages').mockReturnValue(promise as any);

    const abortSpy = jest.spyOn(AbortController.prototype, 'abort');

    const { result } = renderHook(() => usePrefetchImages(URLS, { auto: false }));

    act(() => {
      netInfoListener(WIFI_STATE);
    });

    let prefetchPromise: Promise<any>;
    act(() => {
      prefetchPromise = result.current.prefetch(URLS);
    });

    expect(result.current.isPrefetching).toBe(true);

    act(() => {
      netInfoListener(WIFI_EXPENSIVE_STATE);
    });

    expect(abortSpy).toHaveBeenCalled();

    act(() => {
      resolvePrefetch([true, true, true]);
    });

    const res = await prefetchPromise!;

    expect(res).toEqual([]);
    expect(appLogger.debugSync).toHaveBeenCalledWith(
      'usePrefetchImages: aborted due to network downgrade'
    );
  });

  it('skips prefetch when aggressiveness is explicitly off', async () => {
    mockNetInfoFetch.mockResolvedValue(WIFI_STATE);
    const prefetchSpy = jest.spyOn(ImageCache, 'prefetchImages');

    renderHook(() => usePrefetchImages(URLS, { auto: true, aggressiveness: 'off' }));

    act(() => {
      netInfoListener(WIFI_STATE);
    });

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    expect(prefetchSpy).not.toHaveBeenCalled();
  });

  it('respects the limit option (caps at provided limit, max 10)', async () => {
    mockNetInfoFetch.mockResolvedValue(WIFI_STATE);
    const many = Array.from({ length: 20 }, (_, i) => `https://cdn.example.com/img${i}.jpg`);
    const prefetchSpy = jest
      .spyOn(ImageCache, 'prefetchImages')
      .mockResolvedValue(Array(3).fill(true));

    renderHook(() => usePrefetchImages(many, { auto: true, limit: 3 }));
    act(() => {
      netInfoListener(WIFI_STATE);
    });

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    await waitFor(() => {
      expect(prefetchSpy).toHaveBeenCalled();
      const called = prefetchSpy.mock.calls[0][0];
      expect(called.length).toBeLessThanOrEqual(3);
    });
  });

  it('clamps limit to MAX_LIMIT (10) even if a higher value is passed', async () => {
    mockNetInfoFetch.mockResolvedValue(WIFI_STATE);
    const many = Array.from({ length: 20 }, (_, i) => `https://cdn.example.com/img${i}.jpg`);
    const prefetchSpy = jest
      .spyOn(ImageCache, 'prefetchImages')
      .mockResolvedValue(Array(10).fill(true));

    renderHook(() => usePrefetchImages(many, { auto: true, limit: 50 }));
    act(() => {
      netInfoListener(WIFI_STATE);
    });

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    await waitFor(() => {
      expect(prefetchSpy).toHaveBeenCalled();
      const called = prefetchSpy.mock.calls[0][0];
      expect(called.length).toBeLessThanOrEqual(10);
    });
  });

  it('skips prefetch when data saver is enabled', async () => {
    useSettingsStore.setState({ dataSaverEnabled: true });
    const prefetchSpy = jest.spyOn(ImageCache, 'prefetchImages').mockResolvedValue([]);

    renderHook(() => usePrefetchImages(URLS, { auto: true }));
    act(() => {
      netInfoListener(WIFI_STATE);
    });

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    expect(prefetchSpy).not.toHaveBeenCalled();
    useSettingsStore.setState({ dataSaverEnabled: false });
  });

  it('skips prefetch when battery is low', async () => {
    useDeviceStore.setState({ isLowBattery: true });
    const prefetchSpy = jest.spyOn(ImageCache, 'prefetchImages').mockResolvedValue([]);

    renderHook(() => usePrefetchImages(URLS, { auto: true }));
    act(() => {
      netInfoListener(WIFI_STATE);
    });

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    expect(prefetchSpy).not.toHaveBeenCalled();
    useDeviceStore.setState({ isLowBattery: false });
  });

  it('tracks hit rate when recordHit is called for a prefetched URL', async () => {
    mockNetInfoFetch.mockResolvedValue(WIFI_STATE);
    jest.spyOn(ImageCache, 'prefetchImages').mockResolvedValue([true, true, true]);

    const { result } = renderHook(() =>
      usePrefetchImages(URLS, { auto: true, aggressiveness: 'moderate' })
    );

    act(() => {
      netInfoListener(WIFI_STATE);
    });

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    await waitFor(() => {
      expect(result.current.hitRate).toBe(0);
    });

    // Simulate viewing the first prefetched image
    act(() => {
      result.current.recordHit(URLS[0]);
    });

    expect(result.current.hitRate).toBeGreaterThan(0);
  });

  it('does not increase hit rate for URLs that were not prefetched', async () => {
    const { result } = renderHook(() => usePrefetchImages(URLS, { auto: false }));

    act(() => {
      result.current.recordHit('https://cdn.example.com/not-prefetched.jpg');
    });

    expect(result.current.hitRate).toBe(0);
  });

  it('manual prefetch works on WiFi', async () => {
    mockNetInfoFetch.mockResolvedValue(WIFI_STATE);
    const prefetchSpy = jest.spyOn(ImageCache, 'prefetchImages').mockResolvedValue([true, true]);

    const { result } = renderHook(() => usePrefetchImages([], { auto: false }));
    act(() => {
      netInfoListener(WIFI_STATE);
    });

    await act(async () => {
      await result.current.prefetch(URLS.slice(0, 2));
    });

    expect(prefetchSpy).toHaveBeenCalledWith(URLS.slice(0, 2));
  });

  it('reads prefetch_aggressiveness from AsyncStorage and applies it', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('off');
    const prefetchSpy = jest.spyOn(ImageCache, 'prefetchImages').mockResolvedValue([]);

    const { result } = renderHook(() => usePrefetchImages(URLS, { auto: false }));
    act(() => {
      netInfoListener(WIFI_STATE);
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.prefetch(URLS);
    });

    expect(prefetchSpy).not.toHaveBeenCalled();
  });

  it('explicit aggressiveness prop overrides AsyncStorage value', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('off');
    mockNetInfoFetch.mockResolvedValue(WIFI_STATE);
    const prefetchSpy = jest.spyOn(ImageCache, 'prefetchImages').mockResolvedValue([true]);

    renderHook(() => usePrefetchImages(URLS, { auto: true, aggressiveness: 'moderate' }));
    act(() => {
      netInfoListener(WIFI_STATE);
    });

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    await waitFor(() => {
      expect(prefetchSpy).toHaveBeenCalled();
    });
  });

  it('clearCache resets hit rate and prefetch set', async () => {
    mockNetInfoFetch.mockResolvedValue(WIFI_STATE);
    const prefetchSpy = jest.spyOn(ImageCache, 'prefetchImages').mockResolvedValue([true]);
    jest.spyOn(ImageCache, 'clearCache').mockResolvedValue();

    const { result } = renderHook(() =>
      usePrefetchImages(URLS.slice(0, 1), { auto: false, aggressiveness: 'moderate' })
    );
    act(() => {
      netInfoListener(WIFI_STATE);
    });

    await act(async () => {
      await result.current.prefetch(URLS.slice(0, 1));
    });

    expect(prefetchSpy).toHaveBeenCalled();

    act(() => {
      result.current.recordHit(URLS[0]);
    });
    expect(result.current.hitRate).toBeGreaterThan(0);

    await act(async () => {
      await result.current.clearCache();
    });

    expect(result.current.hitRate).toBe(0);
  });

  it('skips prefetch under memory pressure', async () => {
    (memoryPressureService.isUnderPressure as jest.Mock).mockReturnValue(true);
    const prefetchSpy = jest.spyOn(ImageCache, 'prefetchImages').mockResolvedValue([]);

    renderHook(() => usePrefetchImages(URLS, { auto: true }));
    act(() => {
      netInfoListener(WIFI_STATE);
    });

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    expect(prefetchSpy).not.toHaveBeenCalled();
  });

  it('uses InteractionManager.runAfterInteractions for auto mode', async () => {
    mockNetInfoFetch.mockResolvedValue(WIFI_STATE);
    jest.spyOn(ImageCache, 'prefetchImages').mockResolvedValue([true]);

    renderHook(() => usePrefetchImages(URLS, { auto: true }));
    act(() => {
      netInfoListener(WIFI_STATE);
    });

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    expect(InteractionManager.runAfterInteractions).toHaveBeenCalled();
  });
});
