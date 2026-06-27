/**
 * MEMORY PROFILER — Issue #378 (development-only tooling)
 *
 * Low-level data source and analysis helpers for the in-app memory profiler.
 * This module is intentionally framework-agnostic (no React, no UI) so it can be
 * unit-tested in isolation and consumed by the `useMemoryProfiler` hook.
 *
 * React Native memory-API reality check
 * --------------------------------------
 * The browser `performance.memory` API does NOT exist in Hermes or JSC, and
 * `global.gc()` is not reliably available. The only heap data we can read
 * cheaply from JS is Hermes' instrumented GC stats:
 *
 *   global.HermesInternal?.getInstrumentedStats?.()
 *
 * On Hermes (Expo's default engine since SDK 48) this returns an object that
 * includes `hermes_heapSize` / `hermes_allocatedBytes`-style counters. The exact
 * key names have varied across Hermes versions, so we read a small set of known
 * aliases and fall back to a clearly-labelled "unavailable" snapshot when the
 * API (or the engine) is not present. We never fabricate values.
 */

/** A single point-in-time reading of the JS heap. */
export interface MemorySnapshot {
  /** Wall-clock capture time, `Date.now()`. */
  timestamp: number;
  /** Total heap size in bytes (capacity), or 0 when unavailable. */
  heapSizeBytes: number;
  /** Used portion of the heap in bytes, or 0 when unavailable. */
  usedHeapBytes: number;
  /** External (off-heap) memory in bytes, or 0 when unavailable. */
  externalBytes: number;
  /** `false` when `HermesInternal.getInstrumentedStats` is not accessible. */
  available: boolean;
}

/**
 * Minimum number of samples required before {@link detectLeak} will attempt a
 * determination. Mirrors the 6-sample window described in the issue.
 */
export const LEAK_SAMPLE_WINDOW = 6;

/**
 * Total used-heap growth (in bytes) across the sample window that must be
 * exceeded — in addition to monotonic growth — before a leak is suspected.
 * 10 MB, per the issue heuristic.
 */
export const LEAK_GROWTH_THRESHOLD_BYTES = 10 * 1024 * 1024;
export const MEMORY_PRESSURE_THRESHOLD = 0.7;

/**
 * Hermes' instrumented-stats key names have drifted between engine versions.
 * We probe a prioritised list of aliases for each logical metric and use the
 * first one that resolves to a finite number. This keeps the profiler working
 * across SDK upgrades without fabricating data.
 */
const TOTAL_HEAP_KEYS = ['hermes_heapSize', 'hegc_heap_size', 'js_heapSize'] as const;
const USED_HEAP_KEYS = ['hermes_allocatedBytes', 'hegc_used_heap_size', 'js_usedHeapSize'] as const;
const EXTERNAL_KEYS = [
  'hermes_externalBytes',
  'hegc_external_memory',
  'js_externalMemory',
] as const;

/** Read the first key from `stats` that resolves to a finite number, else 0. */
function readStat(stats: Record<string, unknown>, keys: readonly string[]): number {
  for (const key of keys) {
    const value = Number(stats[key]);
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return 0;
}

/**
 * Capture a single memory snapshot from Hermes' instrumented stats.
 *
 * Callers MUST gate invocation behind `__DEV__` — this function does no gating
 * itself so it stays trivially unit-testable. When `HermesInternal` (or its
 * `getInstrumentedStats` method) is missing — e.g. on JSC or an old SDK — the
 * returned snapshot has `available: false` and all byte fields set to 0.
 */
export function captureMemorySnapshot(): MemorySnapshot {
  const hermes = (global as Record<string, unknown>).HermesInternal as
    | { getInstrumentedStats?: () => unknown }
    | undefined
    | null;

  const stats =
    typeof hermes?.getInstrumentedStats === 'function' ? hermes.getInstrumentedStats() : undefined;

  if (!stats || typeof stats !== 'object') {
    return {
      timestamp: Date.now(),
      heapSizeBytes: 0,
      usedHeapBytes: 0,
      externalBytes: 0,
      available: false,
    };
  }

  const record = stats as Record<string, unknown>;

  return {
    timestamp: Date.now(),
    heapSizeBytes: readStat(record, TOTAL_HEAP_KEYS),
    usedHeapBytes: readStat(record, USED_HEAP_KEYS),
    externalBytes: readStat(record, EXTERNAL_KEYS),
    available: true,
  };
}

/**
 * Heuristically decide whether the recent samples suggest a memory leak.
 *
 * Heuristic (NOT a guarantee — see limitations in docs/memory-profiling.md):
 *  - Requires at least {@link LEAK_SAMPLE_WINDOW} (6) snapshots; returns `false`
 *    otherwise.
 *  - Examines only the last 6 snapshots.
 *  - Returns `true` only when used heap grew strictly monotonically across all
 *    6 consecutive samples AND the total growth from first-to-last exceeds
 *    {@link LEAK_GROWTH_THRESHOLD_BYTES} (10 MB).
 *
 * This deliberately ignores unavailable snapshots' zeroed values by requiring
 * strict monotonic growth (a window containing a 0 used-heap reading cannot be
 * strictly increasing throughout unless every reading is real and rising).
 */
export function detectLeak(snapshots: MemorySnapshot[]): boolean {
  if (snapshots.length < LEAK_SAMPLE_WINDOW) {
    return false;
  }

  const window = snapshots.slice(-LEAK_SAMPLE_WINDOW);

  for (let i = 1; i < window.length; i += 1) {
    if (window[i].usedHeapBytes <= window[i - 1].usedHeapBytes) {
      return false; // not strictly monotonic
    }
  }

  const totalGrowth = window[window.length - 1].usedHeapBytes - window[0].usedHeapBytes;

  return totalGrowth > LEAK_GROWTH_THRESHOLD_BYTES;
}

/**
 * Returns true when JS heap utilization exceeds the configured memory pressure
 * threshold.
 */
export function detectMemoryPressure(snapshot: MemorySnapshot, threshold = MEMORY_PRESSURE_THRESHOLD): boolean {
  return (
    snapshot.available &&
    snapshot.heapSizeBytes > 0 &&
    snapshot.usedHeapBytes / snapshot.heapSizeBytes > threshold
  );
}

export interface MemoryPressureStatus {
  available: boolean;
  heapSizeBytes: number;
  usedHeapBytes: number;
  externalBytes: number;
  utilization: number;
  isHighPressure: boolean;
}

export function getMemoryPressureStatus(snapshot: MemorySnapshot): MemoryPressureStatus {
  const utilization = snapshot.heapSizeBytes > 0 ? snapshot.usedHeapBytes / snapshot.heapSizeBytes : 0;

  return {
    available: snapshot.available,
    heapSizeBytes: snapshot.heapSizeBytes,
    usedHeapBytes: snapshot.usedHeapBytes,
    externalBytes: snapshot.externalBytes,
    utilization,
    isHighPressure: snapshot.available && snapshot.heapSizeBytes > 0 && utilization > MEMORY_PRESSURE_THRESHOLD,
  };
}

/**
 * Format a byte count as a human-readable string, e.g. `45.2 MB`, `512.0 KB`,
 * `0 B`. Uses binary (1024) units and always shows one decimal place for
 * KB and above.
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;

  // Bytes are whole numbers; everything else gets one decimal place.
  return exponent === 0 ? `${value} B` : `${value.toFixed(1)} ${units[exponent]}`;
}
