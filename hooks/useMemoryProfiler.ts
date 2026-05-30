/**
 * useMemoryProfiler — Issue #378 (development-only)
 *
 * Polls Hermes heap stats on a fixed interval, retains a rolling window of
 * snapshots, and surfaces a heuristic leak signal. All sampling is gated behind
 * `__DEV__`: in production builds the interval is never started, so the hook has
 * zero runtime cost beyond returning its initial (empty) state.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { appLogger } from '../src/utils/logger';
import {
  captureMemorySnapshot,
  detectLeak,
  formatBytes,
  type MemorySnapshot,
} from '../src/utils/memoryProfiler';

export interface UseMemoryProfilerOptions {
  /** Polling interval in milliseconds. Default: 2000 (every 2s). */
  intervalMs?: number;
  /** Maximum snapshots to retain; oldest is dropped past this. Default: 30. */
  maxSnapshots?: number;
  /** When `false`, polling never starts (or stops if already running). Default: true. */
  enabled?: boolean;
}

export interface UseMemoryProfilerResult {
  /** Rolling window of captured snapshots, oldest first. */
  snapshots: MemorySnapshot[];
  /** Most recent snapshot, or `null` before the first capture. */
  latest: MemorySnapshot | null;
  /** `true` when {@link detectLeak} flags sustained monotonic growth. */
  isLeakSuspected: boolean;
  /** `false` when the Hermes memory API is not accessible on this engine. */
  isAvailable: boolean;
  /** Empty the retained snapshot window. */
  clearSnapshots: () => void;
  /** Pause sampling without tearing down the hook. */
  pause: () => void;
  /** Resume sampling after a {@link pause}. */
  resume: () => void;
  /** Whether sampling is currently paused. */
  isPaused: boolean;
}

const DEFAULT_INTERVAL_MS = 2000;
const DEFAULT_MAX_SNAPSHOTS = 30;

export function useMemoryProfiler(options?: UseMemoryProfilerOptions): UseMemoryProfilerResult {
  const {
    intervalMs = DEFAULT_INTERVAL_MS,
    maxSnapshots = DEFAULT_MAX_SNAPSHOTS,
    enabled = true,
  } = options ?? {};

  const [snapshots, setSnapshots] = useState<MemorySnapshot[]>([]);
  const [isLeakSuspected, setIsLeakSuspected] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // Mirror paused state into a ref so the interval callback reads the latest
  // value without needing to be re-created (which would reset the timer).
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  // Track whether a leak has already been reported so we only log on the
  // false -> true transition, not on every subsequent tick.
  const leakReportedRef = useRef(false);

  const clearSnapshots = useCallback(() => {
    setSnapshots([]);
    setIsLeakSuspected(false);
    leakReportedRef.current = false;
  }, []);

  const pause = useCallback(() => setIsPaused(true), []);
  const resume = useCallback(() => setIsPaused(false), []);

  useEffect(() => {
    // Profiling is strictly development-only. Outside __DEV__ (or when disabled)
    // we never start the timer, guaranteeing zero sampling cost in production.
    if (!__DEV__ || !enabled) {
      return;
    }

    const tick = () => {
      // Re-check the live guard on every tick: skip while paused.
      if (isPausedRef.current) {
        return;
      }

      const snapshot = captureMemorySnapshot();
      setIsAvailable(snapshot.available);

      // Pure functional update — append, then drop the oldest past the cap.
      setSnapshots(prev =>
        prev.length >= maxSnapshots
          ? [...prev.slice(prev.length - maxSnapshots + 1), snapshot]
          : [...prev, snapshot]
      );
    };

    const id = setInterval(tick, intervalMs);

    return () => clearInterval(id);
  }, [enabled, intervalMs, maxSnapshots]);

  // Derive the leak signal whenever the snapshot window changes. Kept out of the
  // state updater so it has no side effects there (StrictMode-safe) and only
  // warns on the false -> true transition.
  useEffect(() => {
    const suspected = detectLeak(snapshots);
    setIsLeakSuspected(suspected);

    if (suspected && !leakReportedRef.current) {
      leakReportedRef.current = true;
      const latest = snapshots[snapshots.length - 1];
      appLogger.warnSync('Potential memory leak detected', {
        usedHeapMB: formatBytes(latest.usedHeapBytes),
        snapshotCount: snapshots.length,
      });
    } else if (!suspected) {
      // Allow re-reporting if the trend recovers and then re-emerges.
      leakReportedRef.current = false;
    }
  }, [snapshots]);

  return {
    snapshots,
    latest: snapshots.length > 0 ? snapshots[snapshots.length - 1] : null,
    isLeakSuspected,
    isAvailable,
    clearSnapshots,
    pause,
    resume,
    isPaused,
  };
}

export default useMemoryProfiler;
