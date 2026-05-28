import { useCallback, useEffect, useState } from 'react';
import { ImageCache } from '../utils/imageCache';
import logger from '../utils/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UsePrefetchImagesOptions {
  /** Whether to automatically prefetch on mount */
  auto?: boolean;
  /** Callback when prefetch completes */
  onComplete?: (results: boolean[]) => void;
  /** Callback if prefetch fails */
  onError?: (error: Error) => void;
  /** Delay before prefetching (ms) - useful for reducing startup load */
  delay?: number;
}

interface UsePrefetchImagesReturn {
  /** Whether prefetch is currently in progress */
  isPrefetching: boolean;
  /** Array of URLs that were not prefetched successfully */
  failedUrls: string[];
  /** Manually trigger prefetch */
  prefetch: (urls: string[]) => Promise<boolean[]>;
  /** Clear all cached images */
  clearCache: () => Promise<void>;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Hook for prefetching images with the ImageCache utility
 * 
 * Provides efficient image prefetching for performance optimization.
 * Use this for:
 * - Prefetching images in lists before they're scrolled to
 * - Preloading course thumbnails
 * - Warming up avatar caches
 * - Preparing badge images
 * 
 * @param urls Array of image URLs to prefetch
 * @param options Configuration options
 * @returns Object with prefetch state and methods
 * 
 * @example
 * ```tsx
 * // Auto prefetch on mount
 * const { isPrefetching, failedUrls } = usePrefetchImages(imageUrls, { 
 *   auto: true,
 *   delay: 1000 
 * });
 * 
 * // Manual prefetch
 * const { prefetch } = usePrefetchImages([]);
 * const results = await prefetch([newUrl]);
 * ```
 */
export function usePrefetchImages(
  urls: (string | null | undefined)[],
  options: UsePrefetchImagesOptions = {},
): UsePrefetchImagesReturn {
  const { auto = true, onComplete, onError, delay = 0 } = options;

  // ─── State ────────────────────────────────────────────────────────────────

  const [isPrefetching, setIsPrefetching] = useState(false);
  const [failedUrls, setFailedUrls] = useState<string[]>([]);

  // ─── Prefetch function ────────────────────────────────────────────────────

  const prefetch = useCallback(
    async (toFetch: (string | null | undefined)[]) => {
      try {
        setIsPrefetching(true);

        // Filter out null/undefined URLs
        const validUrls = toFetch.filter((url) => !!url) as string[];

        if (validUrls.length === 0) {
          setIsPrefetching(false);
          return [];
        }

        // Prefetch images
        const results = await ImageCache.prefetchImages(validUrls);

        // Track failed URLs
        const failed = validUrls.filter((url, index) => !results[index]);
        setFailedUrls(failed);

        if (failed.length > 0) {
          logger.warn(`Failed to prefetch ${failed.length} images`, { failed });
        } else {
          logger.debug(`✅ Successfully prefetched ${validUrls.length} images`);
        }

        onComplete?.(results);
        return results;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Error prefetching images', err);
        onError?.(err);
        return [];
      } finally {
        setIsPrefetching(false);
      }
    },
    [onComplete, onError],
  );

  // ─── Auto-prefetch on mount or URL change ─────────────────────────────────

  useEffect(() => {
    if (!auto) return;

    const validUrls = urls.filter((url) => !!url) as string[];
    if (validUrls.length === 0) return;

    // Apply delay if specified
    if (delay > 0) {
      const timer = setTimeout(() => {
        prefetch(urls);
      }, delay);

      return () => clearTimeout(timer);
    }

    prefetch(urls);
  }, [urls, auto, delay, prefetch]);

  // ─── Clear cache function ──────────────────────────────────────────────────

  const clearCache = useCallback(async () => {
    try {
      await ImageCache.clearCache();
      setFailedUrls([]);
      logger.info('Image cache cleared');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to clear image cache', err);
      onError?.(err);
    }
  }, [onError]);

  return {
    isPrefetching,
    failedUrls,
    prefetch,
    clearCache,
  };
}

export default usePrefetchImages;
