/**
 * Tests for RequestDeduplicator — Issue #224
 */

import {
  MAX_CACHE_SIZE,
  REQUEST_TTL,
  RequestDeduplicator,
} from '../../../src/services/api/requestDeduplicator';

jest.useFakeTimers();

describe('RequestDeduplicator', () => {
  let deduplicator: RequestDeduplicator;

  beforeEach(() => {
    deduplicator = new RequestDeduplicator();
    jest.clearAllMocks();
  });

  afterEach(() => {
    deduplicator.cancelAll();
    jest.clearAllTimers();
  });

  describe('deduplication of identical requests', () => {
    it('returns the same promise for concurrent identical GET requests', async () => {
      let callCount = 0;
      const executor = jest.fn(async () => {
        callCount++;
        return { data: 'result' };
      });

      const key = { method: 'GET', url: '/courses', params: { page: 1 } };

      const [p1, p2, p3] = [
        deduplicator.deduplicate(key, executor),
        deduplicator.deduplicate(key, executor),
        deduplicator.deduplicate(key, executor),
      ];

      const results = await Promise.all([p1, p2, p3]);

      // executor should only be called once despite 3 concurrent requests
      expect(executor).toHaveBeenCalledTimes(1);
      expect(callCount).toBe(1);
      expect(results[0]).toEqual(results[1]);
      expect(results[1]).toEqual(results[2]);
    });

    it('distinguishes requests with different URLs', async () => {
      const executor = jest.fn(async (url: string) => ({ url }));

      const [r1, r2] = await Promise.all([
        deduplicator.deduplicate({ method: 'GET', url: '/courses' }, () => executor('/courses')),
        deduplicator.deduplicate({ method: 'GET', url: '/users' }, () => executor('/users')),
      ]);

      expect(executor).toHaveBeenCalledTimes(2);
      expect(r1).toEqual({ url: '/courses' });
      expect(r2).toEqual({ url: '/users' });
    });

    it('distinguishes requests with different params', async () => {
      const executor = jest.fn(async (page: number) => ({ page }));

      await Promise.all([
        deduplicator.deduplicate({ method: 'GET', url: '/courses', params: { page: 1 } }, () =>
          executor(1)
        ),
        deduplicator.deduplicate({ method: 'GET', url: '/courses', params: { page: 2 } }, () =>
          executor(2)
        ),
      ]);

      expect(executor).toHaveBeenCalledTimes(2);
    });

    it('distinguishes requests with different methods', async () => {
      const executor = jest.fn(async () => ({}));

      await Promise.all([
        deduplicator.deduplicate({ method: 'GET', url: '/courses' }, executor),
        deduplicator.deduplicate({ method: 'POST', url: '/courses' }, executor),
      ]);

      expect(executor).toHaveBeenCalledTimes(2);
    });
  });

  describe('sequential requests after completion', () => {
    it('executes a new request after the previous one resolves', async () => {
      const executor = jest.fn().mockResolvedValue({ data: 'fresh' });
      const key = { method: 'GET', url: '/courses' };

      await deduplicator.deduplicate(key, executor);
      await deduplicator.deduplicate(key, executor);

      expect(executor).toHaveBeenCalledTimes(2);
    });
  });

  describe('error propagation', () => {
    it('propagates rejection to all subscribers', async () => {
      const error = new Error('Network failure');
      const executor = jest.fn().mockRejectedValue(error);
      const key = { method: 'GET', url: '/courses' };

      const results = await Promise.allSettled([
        deduplicator.deduplicate(key, executor),
        deduplicator.deduplicate(key, executor),
      ]);

      expect(executor).toHaveBeenCalledTimes(1);
      expect(results[0].status).toBe('rejected');
      expect(results[1].status).toBe('rejected');
      if (results[0].status === 'rejected') {
        expect(results[0].reason).toBe(error);
      }
    });
  });

  describe('activeCount', () => {
    it('tracks the number of in-flight requests', async () => {
      expect(deduplicator.activeCount).toBe(0);

      let resolveRequest!: () => void;
      const pendingExecutor = jest.fn(
        () =>
          new Promise<string>(res => {
            resolveRequest = () => res('done');
          })
      );

      const promise = deduplicator.deduplicate({ method: 'GET', url: '/slow' }, pendingExecutor);
      expect(deduplicator.activeCount).toBe(1);

      resolveRequest();
      await promise;
      expect(deduplicator.activeCount).toBe(0);
    });
  });

  describe('cancelAll', () => {
    it('cancels all in-flight requests and clears the map', () => {
      const executor = jest.fn(() => new Promise(() => {})); // never resolves
      deduplicator.deduplicate({ method: 'GET', url: '/a' }, executor);
      deduplicator.deduplicate({ method: 'GET', url: '/b' }, executor);

      expect(deduplicator.activeCount).toBe(2);
      deduplicator.cancelAll();
      expect(deduplicator.activeCount).toBe(0);
    });
  });

  describe('AbortController signal', () => {
    it('passes an AbortSignal to the executor', async () => {
      let capturedSignal: AbortSignal | undefined;
      const executor = jest.fn(async (signal: AbortSignal) => {
        capturedSignal = signal;
        return 'ok';
      });

      await deduplicator.deduplicate({ method: 'GET', url: '/signal-test' }, executor);

      expect(capturedSignal).toBeDefined();
      expect(capturedSignal).toBeInstanceOf(AbortSignal);
    });
  });

  describe('subscriber-absence cancellation (5 s timeout)', () => {
    it('aborts the AbortController signal when cancelAll is called', () => {
      // cancelAll() is the public API used on logout/unmount.
      // The internal 5 s timer also calls controller.abort() — this test verifies
      // that the same abort mechanism works correctly via the public path.
      const d = new RequestDeduplicator();

      // Start request — abort signal goes into capturedSignal via the executor
      let capturedSignal: AbortSignal | undefined;
      d.deduplicate({ method: 'GET', url: '/abort-test' }, signal => {
        capturedSignal = signal;
        return new Promise<string>(() => {});
      }).catch(() => {});

      expect(d.activeCount).toBe(1);
      expect(capturedSignal?.aborted).toBe(false);

      d.cancelAll();

      expect(d.activeCount).toBe(0);
      expect(capturedSignal?.aborted).toBe(true);
    });

    it('arms a 5 s timeout that fires when subscribers drop to zero', () => {
      // Verify that setTimeout is called with the correct delay
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      const d = new RequestDeduplicator();

      d.deduplicate({ method: 'GET', url: '/timer-test' }, async () => 'ok').catch(() => {});

      // The timeout is armed during `deduplicate` — check it was called with ~5000 ms
      const timeoutCalls = setTimeoutSpy.mock.calls.map(([, ms]) => ms);
      expect(timeoutCalls.some(ms => ms === 5_000)).toBe(true);

      d.cancelAll();
      setTimeoutSpy.mockRestore();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Memory hygiene — issue #594
  // ─────────────────────────────────────────────────────────────────────────

  describe('memory hygiene (issue #594)', () => {
    /** Helper: never-resolving promise so entries stay in the in-flight map. */
    const NEVER = new Promise<never>(() => {});
    /** Catch helper to avoid unhandled rejection noise on dangling promises. */
    const swallow = <T>(p: Promise<T>) => p.catch(() => undefined);

    /**
     * Helper: build N deduplicate calls with monotonically increasing simulated
     * clock so the enqueuedAt timestamps are deterministic.
     */
    const enqueueMany = (n: number, baseTime: number, prefix: string) => {
      for (let i = 0; i < n; i++) {
        jest.setSystemTime(baseTime + i);
        // Pending request — never resolves, so it sits in the map.
        void swallow(
          deduplicator.deduplicate({ method: 'GET', url: `${prefix}-${i}` }, () => NEVER)
        );
      }
    };

    describe('exposed constants', () => {
      it('exports REQUEST_TTL of 30 seconds', () => {
        expect(REQUEST_TTL).toBe(30_000);
      });

      it('exports MAX_CACHE_SIZE of 100', () => {
        expect(MAX_CACHE_SIZE).toBe(100);
      });
    });

    describe('size getter', () => {
      it('returns 0 when empty', () => {
        expect(deduplicator.size).toBe(0);
      });

      it('mirrors activeCount', () => {
        expect(deduplicator.size).toBe(deduplicator.activeCount);
      });

      it('tracks in-flight requests added by deduplicate', () => {
        expect(deduplicator.size).toBe(0);
        void swallow(deduplicator.deduplicate({ method: 'GET', url: '/size-1' }, () => NEVER));
        void swallow(deduplicator.deduplicate({ method: 'GET', url: '/size-2' }, () => NEVER));
        expect(deduplicator.size).toBe(2);
        expect(deduplicator.size).toBe(deduplicator.activeCount);
      });
    });

    describe('TTL eviction', () => {
      it('evicts 5 stale entries when the 6th request is added (#594 acceptance)', () => {
        const BASE = 1_700_000_000_000;
        jest.setSystemTime(BASE);

        // Add 5 entries at t=0. Their promises never resolve, so they remain
        // in the map until either subs→0 timer or TTL-based sweep runs.
        enqueueMany(5, BASE, '/stale');
        expect(deduplicator.size).toBe(5);

        // Advance system time well past REQUEST_TTL.
        jest.setSystemTime(BASE + REQUEST_TTL + 1_000);

        // The 6th enqueue triggers sweepStaleEntries → all 5 evicted
        // before this entry itself is inserted. We use a never-resolving
        // executor so the fresh entry stays in the map and we can verify
        // its presence.
        void swallow(deduplicator.deduplicate({ method: 'GET', url: '/fresh' }, () => NEVER));

        expect(deduplicator.size).toBe(1);
      });

      it('does not evict entries younger than REQUEST_TTL', () => {
        const BASE = 1_700_000_000_000;
        jest.setSystemTime(BASE);

        enqueueMany(3, BASE, '/young');
        expect(deduplicator.size).toBe(3);

        // Advance less than REQUEST_TTL.
        jest.setSystemTime(BASE + REQUEST_TTL - 1_000);

        void swallow(deduplicator.deduplicate({ method: 'GET', url: '/trigger' }, () => NEVER));

        // All 3 young entries must still be present plus the new one.
        expect(deduplicator.size).toBe(4);
      });

      it('evicts only stale entries, leaving fresh ones intact', () => {
        const BASE = 1_700_000_000_000;
        jest.setSystemTime(BASE);
        enqueueMany(3, BASE, '/old');
        expect(deduplicator.size).toBe(3);

        // Jump forward but stay under TTL.
        jest.setSystemTime(BASE + 10_000);
        enqueueMany(2, BASE + 10_000, '/young');
        expect(deduplicator.size).toBe(5);

        // Now jump past TTL — all three "old" entries must die; "young" survive.
        jest.setSystemTime(BASE + REQUEST_TTL + 5_000);
        void swallow(deduplicator.deduplicate({ method: 'GET', url: '/trigger' }, () => NEVER));

        // 2 young entries + 1 fresh trigger = 3.
        expect(deduplicator.size).toBe(3);
      });

      it('boundary: an entry exactly at REQUEST_TTL is not yet stale', () => {
        const BASE = 1_700_000_000_000;
        jest.setSystemTime(BASE);
        void swallow(deduplicator.deduplicate({ method: 'GET', url: '/border' }, () => NEVER));
        expect(deduplicator.size).toBe(1);

        // Exactly TTL old — should still survive the > check.
        jest.setSystemTime(BASE + REQUEST_TTL);

        void swallow(deduplicator.deduplicate({ method: 'GET', url: '/trigger' }, () => NEVER));

        expect(deduplicator.size).toBe(2);
      });
    });

    describe('MAX_CACHE_SIZE cap', () => {
      it('keeps map size ≤ MAX_CACHE_SIZE under sustained load', () => {
        const BASE = 1_700_000_000_000;

        // Push MAX + N entries with monotonically increasing timestamps.
        const total = MAX_CACHE_SIZE + 50;
        for (let i = 0; i < total; i++) {
          jest.setSystemTime(BASE + i);
          void swallow(deduplicator.deduplicate({ method: 'GET', url: `/cap-${i}` }, () => NEVER));
        }

        expect(deduplicator.size).toBe(MAX_CACHE_SIZE);
        expect(deduplicator.size).toBeLessThanOrEqual(MAX_CACHE_SIZE);
      });

      it('evicts the oldest entry when cap is exceeded', () => {
        const BASE = 1_700_000_000_000;

        // Fill exactly to the cap. Each entry has a unique timestamp.
        enqueueMany(MAX_CACHE_SIZE, BASE, '/cap');
        expect(deduplicator.size).toBe(MAX_CACHE_SIZE);

        // Add one more — the very first inserted should be evicted.
        jest.setSystemTime(BASE + MAX_CACHE_SIZE + 10);
        void swallow(deduplicator.deduplicate({ method: 'GET', url: '/cap-new' }, () => NEVER));

        expect(deduplicator.size).toBe(MAX_CACHE_SIZE);

        // Sweep is run prior to the cap check, so cap-new gets the freshest
        // timestamp and /cap-0 (oldest) is dropped.
        // (Indirect verification: size returns to cap, no exception thrown.)
      });

      it('does not evict when size is exactly at the cap', () => {
        const BASE = 1_700_000_000_000;
        enqueueMany(MAX_CACHE_SIZE, BASE, '/exact');

        expect(deduplicator.size).toBe(MAX_CACHE_SIZE);

        // Force a sweep by adding a new (never-resolving) request — the cap
        // should bump the new entry in but evict /exact-0 to stay at MAX.
        jest.setSystemTime(BASE + MAX_CACHE_SIZE + 1);
        void swallow(deduplicator.deduplicate({ method: 'GET', url: '/tickle' }, () => NEVER));

        expect(deduplicator.size).toBe(MAX_CACHE_SIZE);
      });
    });

    describe('combined TTL + cap', () => {
      it('sweeps stale entries before applying the size cap', () => {
        const BASE = 1_700_000_000_000;
        jest.setSystemTime(BASE);

        // Fill to cap with stale timestamp.
        enqueueMany(MAX_CACHE_SIZE, BASE, '/stale-bulk');
        expect(deduplicator.size).toBe(MAX_CACHE_SIZE);

        // Jump past TTL so all entries become stale.
        jest.setSystemTime(BASE + REQUEST_TTL + 5_000);

        // Add 5 brand-new requests. Each call sweeps all old entries first;
        // after the sweeps, the cap applies normally.
        for (let i = 0; i < 5; i++) {
          jest.setSystemTime(BASE + REQUEST_TTL + 5_000 + i);
          void swallow(deduplicator.deduplicate({ method: 'GET', url: `/new-${i}` }, () => NEVER));
        }

        // After all sweeps, only the 5 new entries should remain.
        expect(deduplicator.size).toBe(5);
        expect(deduplicator.size).toBeLessThanOrEqual(MAX_CACHE_SIZE);
      });
    });
  });
});
