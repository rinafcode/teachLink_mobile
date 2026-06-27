/**
 * Resource Timing Tracker
 *
 * Captures API call durations and image loading times, maintains a rolling
 * window of recent entries, and exposes aggregated metrics (p50/p95/avg).
 */

export type ResourceType = 'api' | 'image';

export interface TimingEntry {
  id: string;
  type: ResourceType;
  /** URL or endpoint path */
  resource: string;
  /** HTTP method for API calls */
  method?: string;
  /** HTTP status code for API calls */
  status?: number;
  startTime: number;
  duration: number;
  /** Whether the call succeeded */
  success: boolean;
  timestamp: number;
}

export interface AggregatedMetrics {
  count: number;
  avg: number;
  p50: number;
  p95: number;
  min: number;
  max: number;
  errorRate: number;
}

export interface PerformanceSummary {
  api: AggregatedMetrics;
  image: AggregatedMetrics;
  all: AggregatedMetrics;
}

const MAX_ENTRIES = 200;

let entries: TimingEntry[] = [];
let idCounter = 0;

function nextId(): string {
  return `pt_${Date.now()}_${++idCounter}`;
}

/** Start timing a resource. Returns a function to call when done. */
export function startTiming(
  type: ResourceType,
  resource: string,
  method?: string,
): (success: boolean, status?: number) => TimingEntry {
  const id = nextId();
  const startTime = Date.now();

  return (success: boolean, status?: number): TimingEntry => {
    const duration = Date.now() - startTime;
    const entry: TimingEntry = {
      id,
      type,
      resource,
      method,
      status,
      startTime,
      duration,
      success,
      timestamp: Date.now(),
    };

    entries.push(entry);
    // Keep rolling window
    if (entries.length > MAX_ENTRIES) {
      entries = entries.slice(entries.length - MAX_ENTRIES);
    }

    return entry;
  };
}

function computeMetrics(subset: TimingEntry[]): AggregatedMetrics {
  if (subset.length === 0) {
    return { count: 0, avg: 0, p50: 0, p95: 0, min: 0, max: 0, errorRate: 0 };
  }

  const durations = subset.map((e) => e.duration).sort((a, b) => a - b);
  const sum = durations.reduce((acc, d) => acc + d, 0);
  const errors = subset.filter((e) => !e.success).length;

  const percentile = (p: number) => {
    const idx = Math.ceil((p / 100) * durations.length) - 1;
    return durations[Math.max(0, idx)];
  };

  return {
    count: subset.length,
    avg: Math.round(sum / subset.length),
    p50: percentile(50),
    p95: percentile(95),
    min: durations[0],
    max: durations[durations.length - 1],
    errorRate: errors / subset.length,
  };
}

/** Get aggregated metrics for all recorded entries. */
export function getMetrics(): PerformanceSummary {
  const apiEntries = entries.filter((e) => e.type === 'api');
  const imageEntries = entries.filter((e) => e.type === 'image');

  return {
    api: computeMetrics(apiEntries),
    image: computeMetrics(imageEntries),
    all: computeMetrics(entries),
  };
}

/** Get the raw timing entries (most recent first). */
export function getEntries(type?: ResourceType): TimingEntry[] {
  const source = type ? entries.filter((e) => e.type === type) : entries;
  return [...source].reverse();
}

/** Clear all recorded entries (useful for testing). */
export function clearEntries(): void {
  entries = [];
}

/** Subscribe to new timing entries. Returns an unsubscribe function. */
type Listener = (entry: TimingEntry) => void;
const listeners: Set<Listener> = new Set();

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Internal: notify listeners (called by instrumented code). */
export function notifyEntry(entry: TimingEntry): void {
  listeners.forEach((l) => {
    try {
      l(entry);
    } catch {
      // ignore listener errors
    }
  });
}

/**
 * Convenience wrapper: time an async operation and record the result.
 */
export async function timeAsync<T>(
  type: ResourceType,
  resource: string,
  fn: () => Promise<T>,
  method?: string,
): Promise<T> {
  const finish = startTiming(type, resource, method);
  try {
    const result = await fn();
    const entry = finish(true);
    notifyEntry(entry);
    return result;
  } catch (err) {
    const entry = finish(false);
    notifyEntry(entry);
    throw err;
  }
}
