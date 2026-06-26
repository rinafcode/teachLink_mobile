/**
 * STREAMING DATA HOOK
 * 
 * React hook for consuming streaming API responses with progressive rendering support.
 * Manages state for chunks, loading, error, and performance metrics.
 * 
 * Features:
 * - Progressive state updates as chunks arrive
 * - Automatic error handling and retry logic
 * - TTFB and performance metrics
 * - Loading and progress tracking
 * - Easy integration with React components
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { streamingApi, StreamChunk, StreamingConfig } from '../services/api/streaming';
import { appLogger } from '../utils/logger';

export interface UseStreamingDataOptions extends StreamingConfig {
  /** Auto-fetch on mount */
  autoFetch?: boolean;
  /** Max number of retries on failure */
  maxRetries?: number;
  /** Deduplicate items based on a key (e.g., 'id') */
  deduplicateKey?: string;
  /** Optional transformation function for each chunk */
  transform?: <T>(data: T) => T;
}

export interface UseStreamingDataResult<T> {
  /** Accumulated data chunks */
  data: T[];
  /** Loading state (true while initial request is pending) */
  isLoading: boolean;
  /** Streaming state (true while receiving chunks) */
  isStreaming: boolean;
  /** Error if request failed */
  error: Error | null;
  /** Number of chunks received so far */
  chunkCount: number;
  /** Progress percentage (0-100) */
  progress: number;
  /** Time to first byte in milliseconds */
  ttfb: number | null;
  /** Total time spent streaming */
  totalTime: number | null;
  /** Bytes received so far */
  bytesReceived: number;
  /** Manually trigger the stream fetch */
  fetch: () => Promise<void>;
  /** Reset the streaming state */
  reset: () => void;
  /** Retry the request */
  retry: () => Promise<void>;
}

/**
 * Hook for progressive streaming data fetching
 * 
 * @example
 * ```tsx
 * const { data, isStreaming, progress, ttfb } = useStreamingData<SearchResult>(
 *   '/api/search?q=react',
 *   {
 *     autoFetch: true,
 *     deduplicateKey: 'id',
 *     transform: (item) => ({ ...item, loaded: true }),
 *   }
 * );
 * 
 * return (
 *   <>
 *     {data.map((item) => <ResultCard key={item.id} {...item} />)}
 *     {isStreaming && <ProgressBar value={progress} />}
 *     {ttfb && <Text>TTFB: {ttfb}ms</Text>}
 *   </>
 * );
 * ```
 */
export function useStreamingData<T extends object = unknown>(
  endpoint: string,
  options: UseStreamingDataOptions = {}
): UseStreamingDataResult<T> {
  const { autoFetch = true } = options;

  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [chunkCount, setChunkCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [ttfb, setTtfb] = useState<number | null>(null);
  const [totalTime, setTotalTime] = useState<number | null>(null);
  const [bytesReceived, setBytesReceived] = useState(0);

  const dataRef = useRef<T[]>([]);
  const startTimeRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeFetchRef = useRef(false);
  
  const optionsRef = useRef(options);
  optionsRef.current = options;

  /**
   * Execute the streaming request
   */
  const doFetch = useCallback(async () => {
    if (activeFetchRef.current) {
      appLogger.warnSync('Stream already in progress');
      return;
    }

    activeFetchRef.current = true;
    startTimeRef.current = Date.now();
    setIsLoading(true);
    setIsStreaming(true);
    setError(null);
    setData([]);
    setChunkCount(0);
    setProgress(0);
    setTtfb(null);
    setTotalTime(null);
    setBytesReceived(0);
    dataRef.current = [];

    const currentOptions = optionsRef.current;
    const {
      maxRetries = 3,
      deduplicateKey,
      transform,
      onChunk: externalOnChunk,
      ...streamConfig
    } = currentOptions;

    try {
      await streamingApi.streamWithRetry<T>(endpoint, {
        ...streamConfig,
        onChunk: (chunk) => {
          let item = chunk.data;
          if (transform) {
            item = transform(item);
          }
          setData((prev) => {
            if (deduplicateKey && typeof item === 'object' && item !== null) {
              const key = (item as Record<string, any>)[deduplicateKey];
              const isDuplicate = prev.some(
                (existing) =>
                  typeof existing === 'object' &&
                  existing !== null &&
                  (existing as Record<string, any>)[deduplicateKey] === key
              );
              if (isDuplicate) return prev;
            }
            const updated = [...prev, item];
            dataRef.current = updated;
            return updated;
          });
          setChunkCount((c) => c + 1);
          externalOnChunk?.(chunk);
        },
        onProgress: setProgress,
        onFirstByte: setTtfb,
        onError: (err) => {
          // Individual attempt error is handled by streamWithRetry
        },
        maxRetries,
      });

      const elapsed = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
      setTotalTime(elapsed);

      appLogger.infoSync('Streaming data loaded successfully', {
        endpoint,
        items: dataRef.current.length,
        totalTime: elapsed,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);

      appLogger.errorSync('Streaming data fetch failed', error, {
        endpoint,
        attempts: maxRetries,
      });
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      activeFetchRef.current = false;
    }
  }, [endpoint]);

  /**
   * Reset state to initial
   */
  const reset = useCallback(() => {
    setData([]);
    setError(null);
    setChunkCount(0);
    setProgress(0);
    setTtfb(null);
    setTotalTime(null);
    setBytesReceived(0);
    dataRef.current = [];
    startTimeRef.current = null;
  }, []);

  /**
   * Retry the fetch
   */
  const retry = useCallback(async () => {
    reset();
    await doFetch();
  }, [doFetch, reset]);

  /**
   * Auto-fetch on mount if enabled
   */
  useEffect(() => {
    if (autoFetch) {
      void doFetch();
    }

    return () => {
      // Clean up abort controller if needed
      abortControllerRef.current?.abort();
    };
  }, [autoFetch, doFetch]);

  return {
    data,
    isLoading,
    isStreaming,
    error,
    chunkCount,
    progress,
    ttfb,
    totalTime,
    bytesReceived,
    fetch: doFetch,
    reset,
    retry,
  };
}

/**
 * Hook for measuring TTFB of a streaming endpoint
 * Useful for performance monitoring dashboards
 * 
 * @example
 * ```tsx
 * const { ttfb, isLoading } = useTTFBMeasurement('/api/courses');
 * return <Text>{isLoading ? 'Measuring...' : `TTFB: ${ttfb}ms`}</Text>;
 * ```
 */
export function useTTFBMeasurement(endpoint: string) {
  const [ttfb, setTtfb] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsLoading(true);
    streamingApi
      .measureTTFB(endpoint)
      .then(setTtfb)
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, [endpoint]);

  return { ttfb, isLoading, error };
}
