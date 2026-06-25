/**
 * RequestDeduplicator — Issue #224
 *
 * Tracks in-flight requests by method + URL + params so that identical concurrent
 * calls share a single Promise instead of hitting the network multiple times.
 * An AbortController is attached to every deduplicated request; if all subscribers
 * unsubscribe before the request resolves the network call is cancelled.
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
}

const CANCEL_AFTER_MS = 5_000; // cancel if no active subscribers for 5 s

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

    const controller = new AbortController();
    const entry: InFlightEntry<T> = {
      controller,
      subscribers: 1,
      promise: null as unknown as Promise<T>,
      timeoutId: null as unknown as ReturnType<typeof setTimeout>,
    };

    // Store immediately so concurrent callers join this entry.
    this.inFlight.set(cacheKey, entry as InFlightEntry<unknown>);

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

  /** Cancel all in-flight requests (e.g. on logout / unmount). */
  cancelAll(): void {
    for (const [key, entry] of this.inFlight) {
      clearTimeout(entry.timeoutId);
      entry.controller.abort();
      this.inFlight.delete(key);
    }
  }

  // ─── Private helpers ────────────────────────────────────────────────────

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
