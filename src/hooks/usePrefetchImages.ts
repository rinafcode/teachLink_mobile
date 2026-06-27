import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';

import { memoryPressureService } from '../services/memoryPressureService';
import { useDeviceStore } from '../store/deviceStore';
import { useSettingsStore } from '../store/settingsStore';
import { ImageCache } from '../utils/imageCache';
import { appLogger } from '../utils/logger';

// ─── Constants ────────────────────────────────────────────────────────────────

const PREFETCH_AGGRESSIVENESS_KEY = 'prefetch_aggressiveness';
const DEFAULT_AGGRESSIVENESS: PrefetchAggressiveness = 'moderate';
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 10;

// ─── Types ────────────────────────────────────────────────────────────────────

/** Controls which network conditions allow prefetching */
export type PrefetchAggressiveness = 'aggressive' | 'moderate' | 'conservative' | 'off';

interface UsePrefetchImagesOptions {
  /** Whether to automatically prefetch on mount (via InteractionManager) */
  auto?: boolean;
  /** Callback when prefetch completes */
  onComplete?: (results: boolean[]) => void;
  /** Callback if prefetch fails */
  onError?: (error: Error) => void;
  /** Delay before prefetching (ms) */
  delay?: number;
  /** Max images to prefetch ahead (clamped to MAX_LIMIT=10, default 5) */
  limit?: number;
  /**
   * Network aggressiveness. When omitted the value is read from
   * AsyncStorage key `prefetch_aggressiveness`, defaulting to 'moderate'.
   */
  aggressiveness?: PrefetchAggressiveness;
}

interface UsePrefetchImagesReturn {
  /** Whether prefetch is currently in progress */
  isPrefetching: boolean;
  /** Array of URLs that failed to prefetch */
  failedUrls: string[];
  /** Manually trigger prefetch */
  prefetch: (urls: string[]) => Promise<boolean[]>;
  /** Clear all cached images */
  clearCache: () => Promise<void>;
  /** Ratio of prefetched images that were subsequently viewed (0–1) */
  hitRate: number;
  /** Call this when a URL is rendered so the hit rate stays accurate */
  recordHit: (url: string) => void;
}

/**
 * Calculates the effective aggressiveness level factoring in current real-world
 * network parameters retrieved via NetInfo.
 */
function determineEffectiveAggressiveness(
  baseAggressiveness: PrefetchAggressiveness,
  netState: NetInfoState | null
): PrefetchAggressiveness {
  if (baseAggressiveness === 'off' || !netState || !netState.isConnected) {
    return 'off';
  }

  if (
    netState.details &&
    'isConnectionExpensive' in netState.details &&
    netState.details.isConnectionExpensive
  ) {
    return 'off';
  }

  if (netState.type === 'cellular') {
    return 'conservative';
  }

  return baseAggressiveness;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Hook for prefetching images with the ImageCache utility.
 *
 * Provides efficient image prefetching for performance optimization.
 * - Respects data saver, low battery, and memory pressure.
 * - Dynamically updates on network changes using NetInfo.
 * - Caps cellular prefetch to conservative. Disables on metered connections.
 * - Auto mode uses InteractionManager to avoid blocking animations.
 * - Tracks hit rate: call `recordHit(url)` whenever a prefetched image is rendered.
 */
export function usePrefetchImages(
  urls: (string | null | undefined)[],
  options: UsePrefetchImagesOptions = {}
): UsePrefetchImagesReturn {
  const {
    auto = true,
    onComplete,
    onError,
    delay = 0,
    limit,
    aggressiveness: aggressivenessProp,
  } = options;

  const dataSaverEnabled = useSettingsStore(state => state.dataSaverEnabled);
  const isLowBattery = useDeviceStore(state => state.isLowBattery);

  // ─── State ──────────────────────────────────────────────────────────────────

  const [isPrefetching, setIsPrefetching] = useState(false);
  const [failedUrls, setFailedUrls] = useState<string[]>([]);
  const [storedAggressiveness, setStoredAggressiveness] =
    useState<PrefetchAggressiveness>(DEFAULT_AGGRESSIVENESS);
  const [netState, setNetState] = useState<NetInfoState | null>(null);

  // Hit-rate tracking in refs (mutations must not trigger re-renders)
  const prefetchedRef = useRef<Set<string>>(new Set());
  const hitsRef = useRef(0);
  const [hitRate, setHitRate] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    NetInfo.fetch().then(setNetState);

    const unsubscribe = NetInfo.addEventListener((state: any) => {
      setNetState(state);

      const currentAggressive = determineEffectiveAggressiveness(
        aggressivenessProp ?? storedAggressiveness,
        state
      );
      if (currentAggressive === 'off' && isPrefetching) {
        abortControllerRef.current?.abort();
      }
    });

    return unsubscribe;
  }, [aggressivenessProp, storedAggressiveness, isPrefetching]);

  // ─── Effective settings ──────────────────────────────────────────────────────

  const baseAggressiveness = aggressivenessProp ?? storedAggressiveness;
  const runtimeAggressiveness = determineEffectiveAggressiveness(baseAggressiveness, netState);
  const effectiveLimit = Math.min(limit ?? DEFAULT_LIMIT, MAX_LIMIT);

  // ─── Load stored aggressiveness preference on init ───────────────────────────

  useEffect(() => {
    if (aggressivenessProp !== undefined) return; // explicit prop wins
    AsyncStorage.getItem(PREFETCH_AGGRESSIVENESS_KEY)
      .then(value => {
        if (value && ['conservative', 'moderate', 'aggressive', 'off'].includes(value)) {
          setStoredAggressiveness(value as PrefetchAggressiveness);
        }
      })
      .catch(() => {});
  }, [aggressivenessProp]);

  // ─── Prefetch function ───────────────────────────────────────────────────────

  const prefetch = useCallback(
    async (toFetch: (string | null | undefined)[]): Promise<boolean[]> => {
      if (dataSaverEnabled || isLowBattery) {
        appLogger.debugSync(
          `usePrefetchImages: skipped — ${dataSaverEnabled ? 'dataSaver' : 'lowBattery'}`
        );
        return [];
      }

      if (memoryPressureService.isUnderPressure()) {
        appLogger.debugSync('usePrefetchImages: skipped — memory pressure');
        return [];
      }

      if (runtimeAggressiveness === 'off') {
        appLogger.debugSync('usePrefetchImages: skipped — network logic (off or expensive)');
        return [];
      }

      const validUrls = (toFetch.filter(Boolean) as string[]).slice(0, effectiveLimit);
      if (validUrls.length === 0) return [];

      abortControllerRef.current = new AbortController();

      try {
        setIsPrefetching(true);

        appLogger.debugSync('usePrefetchImages: prefetch start', {
          count: validUrls.length,
          aggressiveness: runtimeAggressiveness,
        });

        const results = await ImageCache.prefetchImages(validUrls);

        if (abortControllerRef.current.signal.aborted) {
          appLogger.debugSync('usePrefetchImages: aborted due to network downgrade');
          return [];
        }

        // Register which URLs we prefetched so recordHit can track them
        validUrls.forEach(url => prefetchedRef.current.add(url));

        const failed = validUrls.filter((_, i) => !results[i]);
        setFailedUrls(failed);

        if (failed.length > 0) {
          appLogger.debugSync(`usePrefetchImages: ${failed.length} failed`, { failed });
        } else {
          appLogger.debugSync(`usePrefetchImages: prefetched ${validUrls.length} images`);
        }

        onComplete?.(results);
        return results;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        appLogger.errorSync('usePrefetchImages: error during prefetch', err);
        onError?.(err);
        return [];
      } finally {
        setIsPrefetching(false);
      }
    },
    [dataSaverEnabled, isLowBattery, runtimeAggressiveness, effectiveLimit, onComplete, onError]
  );

  // ─── Auto-prefetch via InteractionManager ────────────────────────────────────

  useEffect(() => {
    if (!auto) return;
    if (dataSaverEnabled || isLowBattery || memoryPressureService.isUnderPressure()) return;
    if (runtimeAggressiveness === 'off') return;

    const validUrls = (urls.filter(Boolean) as string[]).slice(0, effectiveLimit);
    if (validUrls.length === 0) return;

    let cancelled = false;

    const schedule = () => {
      const handle = InteractionManager.runAfterInteractions(() => {
        if (cancelled) return;

        const doFetch = async () => {
          if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          if (!cancelled) {
            await prefetch(validUrls);
          }
        };
        void doFetch();
      });

      return () => {
        cancelled = true;
        handle?.cancel?.();
      };
    };

    return schedule();
  }, [
    urls,
    auto,
    delay,
    effectiveLimit,
    runtimeAggressiveness,
    prefetch,
    dataSaverEnabled,
    isLowBattery,
  ]);

  // ─── Hit-rate tracker ────────────────────────────────────────────────────────

  const recordHit = useCallback((url: string) => {
    if (prefetchedRef.current.has(url)) {
      hitsRef.current += 1;
      const total = prefetchedRef.current.size;
      setHitRate(total > 0 ? hitsRef.current / total : 0);
      appLogger.debugSync('usePrefetchImages: hit', { url, hitRate: hitsRef.current / total });
    } else {
      appLogger.debugSync('usePrefetchImages: miss (not prefetched)', { url });
    }
  }, []);

  // ─── Clear cache ─────────────────────────────────────────────────────────────

  const clearCache = useCallback(async () => {
    try {
      await ImageCache.clearCache();
      setFailedUrls([]);
      prefetchedRef.current.clear();
      hitsRef.current = 0;
      setHitRate(0);
      appLogger.debugSync('usePrefetchImages: cache cleared');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      appLogger.errorSync('usePrefetchImages: failed to clear cache', err);
      onError?.(err);
    }
  }, [onError]);

  return {
    isPrefetching,
    failedUrls,
    prefetch,
    clearCache,
    hitRate,
    recordHit,
  };
}

export default usePrefetchImages;
