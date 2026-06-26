import { useCallback, useMemo, useState } from 'react';

/**
 * Aggregated retry metrics exposed by {@link useErrorBoundaryMetrics}.
 */
export interface ErrorBoundaryMetrics {
  /** Total errors caught (each catch, including those that later succeed on retry). */
  totalErrors: number;
  /** Total retries that have resolved one way or another (successes + failures). */
  totalRetries: number;
  /** Retries that recovered the child tree. */
  successfulRetries: number;
  /** Retries that were abandoned (exhausted or non-transient). */
  failedRetries: number;
  /** `successfulRetries / totalRetries`, or 0 when no retries have resolved. */
  successRate: number;
}

/**
 * Return shape of {@link useErrorBoundaryMetrics}.
 */
export interface UseErrorBoundaryMetricsResult {
  metrics: ErrorBoundaryMetrics;
  recordError: () => void;
  recordRetrySuccess: () => void;
  recordRetryFailure: () => void;
  resetMetrics: () => void;
}

interface MetricsCounters {
  totalErrors: number;
  totalRetries: number;
  successfulRetries: number;
  failedRetries: number;
}

const INITIAL_COUNTERS: MetricsCounters = {
  totalErrors: 0,
  totalRetries: 0,
  successfulRetries: 0,
  failedRetries: 0,
};

/**
 * In-memory store for error-boundary retry metrics, scoped to the React tree that
 * mounts it. Wire the returned callbacks into a {@link RetryErrorBoundary}'s
 * `onError` / `onRetrySuccess` / `onMaxRetriesReached` props to record events.
 *
 * Counters live in React state (not module-level mutable variables) so each consumer
 * gets its own isolated tally. `successRate` is derived, never stored.
 */
export function useErrorBoundaryMetrics(): UseErrorBoundaryMetricsResult {
  const [counters, setCounters] = useState<MetricsCounters>(INITIAL_COUNTERS);

  const recordError = useCallback(() => {
    setCounters(prev => ({ ...prev, totalErrors: prev.totalErrors + 1 }));
  }, []);

  const recordRetrySuccess = useCallback(() => {
    setCounters(prev => ({
      ...prev,
      successfulRetries: prev.successfulRetries + 1,
      totalRetries: prev.totalRetries + 1,
    }));
  }, []);

  const recordRetryFailure = useCallback(() => {
    setCounters(prev => ({
      ...prev,
      failedRetries: prev.failedRetries + 1,
      totalRetries: prev.totalRetries + 1,
    }));
  }, []);

  const resetMetrics = useCallback(() => {
    setCounters(INITIAL_COUNTERS);
  }, []);

  const successRate = useMemo(
    () => (counters.totalRetries === 0 ? 0 : counters.successfulRetries / counters.totalRetries),
    [counters.totalRetries, counters.successfulRetries]
  );

  const metrics = useMemo<ErrorBoundaryMetrics>(
    () => ({ ...counters, successRate }),
    [counters, successRate]
  );

  return { metrics, recordError, recordRetrySuccess, recordRetryFailure, resetMetrics };
}

export default useErrorBoundaryMetrics;
