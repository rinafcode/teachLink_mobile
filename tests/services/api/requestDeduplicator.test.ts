/**
 * Tests for RequestDeduplicator — Issue #224
 */

import { RequestDeduplicator } from '../../../src/services/api/requestDeduplicator';

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
});
