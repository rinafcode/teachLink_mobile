/**
 * RequestDeduplicator — Issues #224, #594
 *
 * Tracks in-flight requests by method + URL + params so that identical concurrent
 * calls share a single Promise instead of hitting the network multiple times.
 * An AbortController is attached to every deduplicated request; if all subscribers
 * unsubscribe before the request resolves the network call is cancelled.
 *
 * Memory hygiene (issue #594):
 *   - Each entry is timestamped at enqueue time.
 *   - On every new request enqueue we perform a lazy sweep that evicts entries
 *     older than {@link REQUEST_TTL}.
 *   - The map is also capped at {@link MAX_CACHE_SIZE}; the oldest entry is
 *     evicted on every new insert once the cap is exceeded.
 *   - {@link size} is exposed so monitoring services (e.g. MemoryPressureService)
 *     can observe current pressure.
 *
 * Usage
 * -----
 * ```ts
 * const result = await requestDeduplicator.deduplicate(
 *   { method: 'GET', url: '/courses', params: { page: 1 } },
 *   () => apiClient.get('/courses', { params: { page: 1 } })
 * );
 * ```
 */

/** Canonical key used to identify an in-flight request. */
export interface DedupeKey {
  method: string;
  url: string;
  params?: unknown;
}

interface InFlightEntry<T> {
  promise: Promise<T>;
  controller: AbortController;
  subscribers: number;
  timeoutId: ReturnType<typeof setTimeout>;
  /** Epoch millis when the entry was added to the map (issue #594). */
  enqueuedAt: number;
}

const CANCEL_AFTER_MS = 5_000; // cancel if no active subscribers for 5 s

/** Maximum age (ms) of an entry before it is considered stale (issue #594). */
export const REQUEST_TTL = 30_000;

/** Hard upper bound on simultaneous in-flight entries (issue #594). */
export const MAX_CACHE_SIZE = 100;

function buildKey({ method, url, params }: DedupeKey): string {
  const serialised = params == null ? '' : JSON.stringify(params);
  return `${method.toUpperCase()}:${url}${serialised ? `:${serialised}` : ''}`;
}

export class RequestDeduplicator {
  private readonly inFlight = new Map<string, InFlightEntry<unknown>>();

  /**
   * Deduplicate `executor` against any in-flight request with the same key.
   *
   * @param key     – method + URL + params that identify the request
   * @param executor – factory that initiates the actual network call
   */
  async deduplicate<T>(key: DedupeKey, executor: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const cacheKey = buildKey(key);
    const existing = this.inFlight.get(cacheKey) as InFlightEntry<T> | undefined;

    if (existing) {
      existing.subscribers += 1;
      clearTimeout(existing.timeoutId);
      try {
        return await existing.promise;
      } finally {
        this.unsubscribe(cacheKey, existing);
      }
    }

    // Lazy eviction — issue #594. Runs only when we are about to add a new
    // entry, so the cost is amortized across real traffic.
    this.sweepStaleEntries();

    const controller = new AbortController();
    const entry: InFlightEntry<T> = {
      controller,
      subscribers: 1,
      promise: null as unknown as Promise<T>,
      timeoutId: null as unknown as ReturnType<typeof setTimeout>,
      enqueuedAt: Date.now(),
    };

    // Store immediately so concurrent callers join this entry.
    this.inFlight.set(cacheKey, entry as InFlightEntry<unknown>);

    // Size cap is enforced AFTER the insert so a single call can correct any
    // drift caused by past growth (e.g. concurrent inserts racing each other).
    this.enforceSizeCap();

    entry.promise = executor(controller.signal).finally(() => {
      this.inFlight.delete(cacheKey);
    });

    // Arm the subscriber-absence timeout.
    entry.timeoutId = this.armTimeout(cacheKey, entry, controller);

    try {
      return await entry.promise;
    } finally {
      this.unsubscribe(cacheKey, entry);
    }
  }

  /** Return the number of currently in-flight deduplicated requests. */
  get activeCount(): number {
    return this.inFlight.size;
  }

  /**
   * Current size of the in-flight map. Alias of `activeCount`, exposed under
   * a more general name so monitoring services (e.g. MemoryPressureService)
   * can observe pressure without coupling to the dedup-specific terminology.
   */
  get size(): number {
    return this.inFlight.size;
  }

  /** Cancel all in-flight requests (e.g. on logout / unmount). */
  cancelAll(): void {
    for (const [key, entry] of this.inFlight) {
      clearTimeout(entry.timeoutId);
      entry.controller.abort();
      this.inFlight.delete(key);
    }
  }

  // ─── Private helpers ────────────────────────────────────────────────────

  /**
   * Evict entries whose `enqueuedAt` is older than {@link REQUEST_TTL}.
   * Called lazily on every new `deduplicate` so the cost is negligible.
   * The underlying promise is left to settle on its own — the entry is simply
   * detached from the map so future lookups start a fresh request.
   */
  private sweepStaleEntries(now: number = Date.now()): void {
    for (const [key, entry] of this.inFlight) {
      if (now - entry.enqueuedAt > REQUEST_TTL) {
        clearTimeout(entry.timeoutId);
        this.inFlight.delete(key);
      }
    }
  }

  /**
   * Drop the oldest entries until the map is at most
   * {@link MAX_CACHE_SIZE}. Called in tandem with `sweepStaleEntries` from
   * `deduplicate` (after the new entry has been inserted).
   */
  private enforceSizeCap(): void {
    while (this.inFlight.size > MAX_CACHE_SIZE) {
      let oldestKey: string | undefined;
      let oldestEnqueuedAt = Number.POSITIVE_INFINITY;

      for (const [key, entry] of this.inFlight) {
        if (entry.enqueuedAt < oldestEnqueuedAt) {
          oldestEnqueuedAt = entry.enqueuedAt;
          oldestKey = key;
        }
      }

      if (oldestKey === undefined) {
        break;
      }

      const entry = this.inFlight.get(oldestKey);
      if (entry) {
        clearTimeout(entry.timeoutId);
      }
      this.inFlight.delete(oldestKey);
    }
  }

  private unsubscribe<T>(key: string, entry: InFlightEntry<T>): void {
    entry.subscribers -= 1;

    if (entry.subscribers <= 0 && this.inFlight.has(key)) {
      // Arm a grace-period before cancelling — another subscriber may arrive.
      clearTimeout(entry.timeoutId);
      entry.timeoutId = this.armTimeout(key, entry, entry.controller);
    }
  }

  private armTimeout<T>(
    key: string,
    entry: InFlightEntry<T>,
    controller: AbortController
  ): ReturnType<typeof setTimeout> {
    return setTimeout(() => {
      if (entry.subscribers <= 0 && this.inFlight.has(key)) {
        controller.abort();
        this.inFlight.delete(key);
      }
    }, CANCEL_AFTER_MS);
  }
}

/** Singleton shared across the API layer. */
export const requestDeduplicator = new RequestDeduplicator();
