import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCellularGenerationAsync, getNetworkStateAsync, NetworkStateType } from 'expo-network';
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
export type PrefetchAggressiveness =
  | 'conservative' // WiFi only
  | 'moderate' // WiFi or 4G+
  | 'off'; // Never prefetch

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

// ─── Network gate ─────────────────────────────────────────────────────────────

/**
 * Converts the network type field (which may be a string, number, or enum
 * depending on the expo-network version) to a normalised uppercase string so
 * comparisons are robust across mock and real environments.
 */
function normaliseType(type: unknown): string {
  return (type ?? '').toString().toUpperCase();
}

async function networkAllowsPrefetch(
  aggressiveness: PrefetchAggressiveness
): Promise<{ allowed: boolean; reason?: string }> {
  if (aggressiveness === 'off') {
    return { allowed: false, reason: 'prefetch-disabled' };
  }

  try {
    const state = await getNetworkStateAsync();

    if (!state.isConnected) {
      return { allowed: false, reason: 'offline' };
    }

    const typeStr = normaliseType(state.type);

    // WiFi is always acceptable for both modes
    if (typeStr === 'WIFI' || typeStr === String(NetworkStateType.WIFI)) {
      return { allowed: true };
    }

    if (aggressiveness === 'conservative') {
      return { allowed: false, reason: 'conservative:not-wifi' };
    }

    // moderate: also allow 4G / 5G cellular
    const isCellular = typeStr === 'CELLULAR' || typeStr === String(NetworkStateType.CELLULAR);
    if (isCellular) {
      try {
        const gen = await getCellularGenerationAsync();
        const genStr = (gen ?? '').toString().toUpperCase().replace('CELLULAR_', '');
        // Accept both 'CELLULAR_4G'→'4G' and plain '4G' or '4g'
        if (genStr === '4G' || genStr === '5G') {
          return { allowed: true };
        }
        return { allowed: false, reason: `moderate:below-4g(${genStr})` };
      } catch {
        return { allowed: false, reason: 'moderate:cellular-gen-unknown' };
      }
    }

    return { allowed: false, reason: `moderate:type-${typeStr}` };
  } catch {
    return { allowed: false, reason: 'network-check-failed' };
  }
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Hook for prefetching images with the ImageCache utility.
 *
 * Provides efficient image prefetching for performance optimization.
 * - Respects data saver, low battery, and memory pressure.
 * - Network-gated: only prefetches on WiFi (conservative) or WiFi+4G (moderate).
 * - Auto mode uses InteractionManager to avoid blocking animations.
 * - Tracks hit rate: call `recordHit(url)` whenever a prefetched image is rendered.
 *
 * @example
 * ```tsx
 * const { isPrefetching, hitRate, recordHit } = usePrefetchImages(thumbnailUrls, {
 *   auto: true,
 *   limit: 10,
 *   aggressiveness: 'moderate',
 * });
 * ```
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

  // Hit-rate tracking in refs (mutations must not trigger re-renders)
  const prefetchedRef = useRef<Set<string>>(new Set());
  const hitsRef = useRef(0);
  const [hitRate, setHitRate] = useState(0);

  // ─── Effective settings ──────────────────────────────────────────────────────

  const effectiveAggressiveness = aggressivenessProp ?? storedAggressiveness;
  const effectiveLimit = Math.min(limit ?? DEFAULT_LIMIT, MAX_LIMIT);

  // ─── Load stored aggressiveness preference on init ───────────────────────────

  useEffect(() => {
    if (aggressivenessProp !== undefined) return; // explicit prop wins
    AsyncStorage.getItem(PREFETCH_AGGRESSIVENESS_KEY)
      .then(value => {
        if (value === 'conservative' || value === 'moderate' || value === 'off') {
          setStoredAggressiveness(value);
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

      const { allowed, reason } = await networkAllowsPrefetch(effectiveAggressiveness);
      if (!allowed) {
        appLogger.debugSync(`usePrefetchImages: skipped — network (${reason})`);
        return [];
      }

      const validUrls = (toFetch.filter(Boolean) as string[]).slice(0, effectiveLimit);
      if (validUrls.length === 0) return [];

      try {
        setIsPrefetching(true);

        appLogger.debugSync('usePrefetchImages: prefetch start', {
          count: validUrls.length,
          aggressiveness: effectiveAggressiveness,
        });

        const results = await ImageCache.prefetchImages(validUrls);

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

    [dataSaverEnabled, isLowBattery, effectiveAggressiveness, effectiveLimit, onComplete, onError]
  );

  // ─── Auto-prefetch via InteractionManager ────────────────────────────────────

  useEffect(() => {
    if (!auto) return;
    if (dataSaverEnabled || isLowBattery) return;
    if (memoryPressureService.isUnderPressure()) return;

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
    effectiveAggressiveness,
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
