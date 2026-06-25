import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { InteractionManager } from 'react-native';

import { usePrefetchImages } from '../../hooks/usePrefetchImages';
import { memoryPressureService } from '../../services/memoryPressureService';
import { useDeviceStore } from '../../store/deviceStore';
import { useSettingsStore } from '../../store/settingsStore';
import { ImageCache } from '../../utils/imageCache';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('expo-image', () => ({
  Image: {
    prefetch: jest.fn(() => Promise.resolve(true)),
    clearMemoryCache: jest.fn(() => Promise.resolve()),
    clearDiskCache: jest.fn(() => Promise.resolve()),
  },
}));

// Override the global expo-network mock with controllable fns
const mockGetNetworkState = jest.fn();
const mockGetCellularGeneration = jest.fn();

jest.mock('expo-network', () => ({
  getNetworkStateAsync: (...args: unknown[]) => mockGetNetworkState(...args),
  getCellularGenerationAsync: (...args: unknown[]) => mockGetCellularGeneration(...args),
  addNetworkStateListener: jest.fn(() => ({ remove: jest.fn() })),
  // Use string values that normaliseType() will match via .toUpperCase()
  NetworkStateType: {
    NONE: 'NONE',
    UNKNOWN: 'UNKNOWN',
    CELLULAR: 'CELLULAR',
    WIFI: 'WIFI',
    ETHERNET: 'ETHERNET',
  },
  CellularGeneration: {
    CELLULAR_4G: 'CELLULAR_4G',
    CELLULAR_5G: 'CELLULAR_5G',
    CELLULAR_3G: 'CELLULAR_3G',
    CELLULAR_2G: 'CELLULAR_2G',
  },
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
    infoSync: jest.fn(),
    warnSync: jest.fn(),
    errorSync: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    component: jest.fn(),
  },
}));

jest.mock('../../services/memoryPressureService', () => ({
  memoryPressureService: {
    isUnderPressure: jest.fn(() => false),
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WIFI_STATE = { isConnected: true, isInternetReachable: true, type: 'WIFI' };
const CELLULAR_STATE = { isConnected: true, isInternetReachable: true, type: 'CELLULAR' };
const OFFLINE_STATE = { isConnected: false, isInternetReachable: false, type: 'NONE' };

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

    // Default: WiFi connected
    mockGetNetworkState.mockResolvedValue(WIFI_STATE);
    mockGetCellularGeneration.mockResolvedValue('CELLULAR_4G');

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

  // ─── 1. Basic smoke test ───────────────────────────────────────────────────

  it('returns correct initial state', () => {
    const { result } = renderHook(() => usePrefetchImages([], { auto: false }));

    expect(result.current.isPrefetching).toBe(false);
    expect(result.current.failedUrls).toEqual([]);
    expect(result.current.hitRate).toBe(0);
    expect(typeof result.current.prefetch).toBe('function');
    expect(typeof result.current.clearCache).toBe('function');
    expect(typeof result.current.recordHit).toBe('function');
  });

  // ─── 2. WiFi allows prefetch ───────────────────────────────────────────────

  it('prefetches when on WiFi', async () => {
    mockGetNetworkState.mockResolvedValue(WIFI_STATE);
    const prefetchSpy = jest.spyOn(ImageCache, 'prefetchImages').mockResolvedValue([true, true]);

    renderHook(() => usePrefetchImages(URLS, { auto: true, aggressiveness: 'moderate' }));

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    await waitFor(() => {
      expect(prefetchSpy).toHaveBeenCalled();
    });
  });

  // ─── 3. 3G blocks prefetch (moderate mode) ────────────────────────────────

  it('skips prefetch on 3G when aggressiveness is moderate', async () => {
    mockGetNetworkState.mockResolvedValue(CELLULAR_STATE);
    mockGetCellularGeneration.mockResolvedValue('CELLULAR_3G');
    const prefetchSpy = jest.spyOn(ImageCache, 'prefetchImages').mockResolvedValue([true]);

    renderHook(() => usePrefetchImages(URLS, { auto: true, aggressiveness: 'moderate' }));

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    // Wait a tick for async operations to settle
    await act(async () => {});

    expect(prefetchSpy).not.toHaveBeenCalled();
  });

  // ─── 4. 4G allows prefetch (moderate mode) ────────────────────────────────

  it('prefetches on 4G when aggressiveness is moderate', async () => {
    mockGetNetworkState.mockResolvedValue(CELLULAR_STATE);
    mockGetCellularGeneration.mockResolvedValue('CELLULAR_4G');
    const prefetchSpy = jest.spyOn(ImageCache, 'prefetchImages').mockResolvedValue([true, true]);

    renderHook(() => usePrefetchImages(URLS, { auto: true, aggressiveness: 'moderate' }));

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    await waitFor(() => {
      expect(prefetchSpy).toHaveBeenCalled();
    });
  });

  // ─── 5. Conservative blocks cellular ──────────────────────────────────────

  it('skips prefetch on cellular when aggressiveness is conservative', async () => {
    mockGetNetworkState.mockResolvedValue(CELLULAR_STATE);
    mockGetCellularGeneration.mockResolvedValue('CELLULAR_4G');
    const prefetchSpy = jest.spyOn(ImageCache, 'prefetchImages').mockResolvedValue([true]);

    renderHook(() => usePrefetchImages(URLS, { auto: true, aggressiveness: 'conservative' }));

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    await act(async () => {});

    expect(prefetchSpy).not.toHaveBeenCalled();
  });

  // ─── 6. Conservative allows WiFi ──────────────────────────────────────────

  it('prefetches on WiFi when aggressiveness is conservative', async () => {
    mockGetNetworkState.mockResolvedValue(WIFI_STATE);
    const prefetchSpy = jest.spyOn(ImageCache, 'prefetchImages').mockResolvedValue([true, true]);

    renderHook(() => usePrefetchImages(URLS, { auto: true, aggressiveness: 'conservative' }));

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    await waitFor(() => {
      expect(prefetchSpy).toHaveBeenCalled();
    });
  });

  // ─── 7. Offline skips prefetch ────────────────────────────────────────────

  it('skips prefetch when offline', async () => {
    mockGetNetworkState.mockResolvedValue(OFFLINE_STATE);
    const prefetchSpy = jest.spyOn(ImageCache, 'prefetchImages').mockResolvedValue([]);

    renderHook(() => usePrefetchImages(URLS, { auto: true }));

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    await act(async () => {});

    expect(prefetchSpy).not.toHaveBeenCalled();
  });

  // ─── 8. 'off' aggressiveness skips prefetch ───────────────────────────────

  it('skips prefetch when aggressiveness is off', async () => {
    mockGetNetworkState.mockResolvedValue(WIFI_STATE);
    const prefetchSpy = jest.spyOn(ImageCache, 'prefetchImages').mockResolvedValue([]);

    renderHook(() => usePrefetchImages(URLS, { auto: true, aggressiveness: 'off' }));

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    await act(async () => {});

    expect(prefetchSpy).not.toHaveBeenCalled();
  });

  // ─── 9. Slow network (network check throws) ───────────────────────────────

  it('handles network check failure gracefully (no crash)', async () => {
    mockGetNetworkState.mockRejectedValue(new Error('Network module unavailable'));
    const prefetchSpy = jest.spyOn(ImageCache, 'prefetchImages').mockResolvedValue([]);

    renderHook(() => usePrefetchImages(URLS, { auto: true }));

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    await act(async () => {});

    // Should not prefetch and should not throw
    expect(prefetchSpy).not.toHaveBeenCalled();
  });

  // ─── 10. Respects limit ───────────────────────────────────────────────────

  it('respects the limit option (caps at provided limit, max 10)', async () => {
    mockGetNetworkState.mockResolvedValue(WIFI_STATE);
    const many = Array.from({ length: 20 }, (_, i) => `https://cdn.example.com/img${i}.jpg`);
    const prefetchSpy = jest
      .spyOn(ImageCache, 'prefetchImages')
      .mockResolvedValue(Array(3).fill(true));

    renderHook(() => usePrefetchImages(many, { auto: true, limit: 3 }));

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    await waitFor(() => {
      expect(prefetchSpy).toHaveBeenCalled();
      const called = prefetchSpy.mock.calls[0][0];
      expect(called.length).toBeLessThanOrEqual(3);
    });
  });

  // ─── 11. Max limit clamped to 10 ─────────────────────────────────────────

  it('clamps limit to MAX_LIMIT (10) even if a higher value is passed', async () => {
    mockGetNetworkState.mockResolvedValue(WIFI_STATE);
    const many = Array.from({ length: 20 }, (_, i) => `https://cdn.example.com/img${i}.jpg`);
    const prefetchSpy = jest
      .spyOn(ImageCache, 'prefetchImages')
      .mockResolvedValue(Array(10).fill(true));

    renderHook(() => usePrefetchImages(many, { auto: true, limit: 50 }));

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    await waitFor(() => {
      expect(prefetchSpy).toHaveBeenCalled();
      const called = prefetchSpy.mock.calls[0][0];
      expect(called.length).toBeLessThanOrEqual(10);
    });
  });

  // ─── 12. Data saver skips prefetch ───────────────────────────────────────

  it('skips prefetch when data saver is enabled', async () => {
    useSettingsStore.setState({ dataSaverEnabled: true });
    const prefetchSpy = jest.spyOn(ImageCache, 'prefetchImages').mockResolvedValue([]);

    renderHook(() => usePrefetchImages(URLS, { auto: true }));

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    await act(async () => {});

    expect(prefetchSpy).not.toHaveBeenCalled();
    useSettingsStore.setState({ dataSaverEnabled: false });
  });

  // ─── 13. Low battery skips prefetch ──────────────────────────────────────

  it('skips prefetch when battery is low', async () => {
    useDeviceStore.setState({ isLowBattery: true });
    const prefetchSpy = jest.spyOn(ImageCache, 'prefetchImages').mockResolvedValue([]);

    renderHook(() => usePrefetchImages(URLS, { auto: true }));

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    await act(async () => {});

    expect(prefetchSpy).not.toHaveBeenCalled();
    useDeviceStore.setState({ isLowBattery: false });
  });

  // ─── 14. Hit rate tracking ────────────────────────────────────────────────

  it('tracks hit rate when recordHit is called for a prefetched URL', async () => {
    mockGetNetworkState.mockResolvedValue(WIFI_STATE);
    jest.spyOn(ImageCache, 'prefetchImages').mockResolvedValue([true, true, true]);

    const { result } = renderHook(() =>
      usePrefetchImages(URLS, { auto: true, aggressiveness: 'moderate' })
    );

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    await waitFor(() => {
      // At this point prefetch ran; hitRate still 0 (no hits recorded yet)
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

  // ─── 15. Manual prefetch with manual auto: false ──────────────────────────

  it('manual prefetch works on WiFi', async () => {
    mockGetNetworkState.mockResolvedValue(WIFI_STATE);
    const prefetchSpy = jest.spyOn(ImageCache, 'prefetchImages').mockResolvedValue([true, true]);

    const { result } = renderHook(() => usePrefetchImages([], { auto: false }));

    await act(async () => {
      await result.current.prefetch(URLS.slice(0, 2));
    });

    expect(prefetchSpy).toHaveBeenCalledWith(URLS.slice(0, 2));
  });

  it('manual prefetch is blocked on 3G moderate', async () => {
    mockGetNetworkState.mockResolvedValue(CELLULAR_STATE);
    mockGetCellularGeneration.mockResolvedValue('CELLULAR_3G');
    const prefetchSpy = jest.spyOn(ImageCache, 'prefetchImages').mockResolvedValue([]);

    const { result } = renderHook(() =>
      usePrefetchImages([], { auto: false, aggressiveness: 'moderate' })
    );

    await act(async () => {
      await result.current.prefetch(URLS);
    });

    expect(prefetchSpy).not.toHaveBeenCalled();
  });

  // ─── 16. Reads aggressiveness from AsyncStorage ───────────────────────────

  it('reads prefetch_aggressiveness from AsyncStorage and applies it to manual prefetch', async () => {
    // Stored value is 'conservative'
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('conservative');
    const prefetchSpy = jest.spyOn(ImageCache, 'prefetchImages').mockResolvedValue([]);

    // auto: false so the prefetch doesn't fire before AsyncStorage resolves
    const { result } = renderHook(() => usePrefetchImages(URLS, { auto: false }));

    // Flush microtasks so the AsyncStorage effect has time to load and
    // update storedAggressiveness to 'conservative'
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve(); // two ticks to cover the setState update
    });

    // Now set up network as 4G cellular — conservative mode should block this
    mockGetNetworkState.mockResolvedValue(CELLULAR_STATE);
    mockGetCellularGeneration.mockResolvedValue('CELLULAR_4G');

    await act(async () => {
      await result.current.prefetch(URLS);
    });

    // Conservative + cellular (even 4G) → no prefetch
    expect(prefetchSpy).not.toHaveBeenCalled();
  });

  // ─── 17. Explicit prop overrides stored preference ────────────────────────

  it('explicit aggressiveness prop overrides AsyncStorage value', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('off');
    mockGetNetworkState.mockResolvedValue(WIFI_STATE);
    const prefetchSpy = jest.spyOn(ImageCache, 'prefetchImages').mockResolvedValue([true]);

    // Explicit 'conservative' prop should override the 'off' stored value
    renderHook(() => usePrefetchImages(URLS, { auto: true, aggressiveness: 'conservative' }));

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    await waitFor(() => {
      expect(prefetchSpy).toHaveBeenCalled();
    });
  });

  // ─── 18. clearCache resets hit rate ──────────────────────────────────────

  it('clearCache resets hit rate and prefetch set', async () => {
    mockGetNetworkState.mockResolvedValue(WIFI_STATE);
    const prefetchSpy = jest.spyOn(ImageCache, 'prefetchImages').mockResolvedValue([true]);
    jest.spyOn(ImageCache, 'clearCache').mockResolvedValue();

    // Use auto: false so we control timing with manual prefetch (avoids async act loops)
    const { result } = renderHook(() =>
      usePrefetchImages(URLS.slice(0, 1), { auto: false, aggressiveness: 'moderate' })
    );

    // Manually prefetch so the URL is registered in prefetchedRef
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

  // ─── 19. Memory pressure skips prefetch ──────────────────────────────────

  it('skips prefetch under memory pressure', async () => {
    (memoryPressureService.isUnderPressure as jest.Mock).mockReturnValue(true);
    const prefetchSpy = jest.spyOn(ImageCache, 'prefetchImages').mockResolvedValue([]);

    renderHook(() => usePrefetchImages(URLS, { auto: true }));

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    await act(async () => {});

    expect(prefetchSpy).not.toHaveBeenCalled();
  });

  // ─── 20. Uses InteractionManager for auto mode ────────────────────────────

  it('uses InteractionManager.runAfterInteractions for auto mode', async () => {
    mockGetNetworkState.mockResolvedValue(WIFI_STATE);
    jest.spyOn(ImageCache, 'prefetchImages').mockResolvedValue([true]);

    renderHook(() => usePrefetchImages(URLS, { auto: true }));

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    expect(InteractionManager.runAfterInteractions).toHaveBeenCalled();
  });
});
