import {
  MAX_CACHE_SIZE,
  REQUEST_TTL,
  RequestDeduplicator,
  requestDeduplicator,
} from '../requestDeduplicator';

describe('RequestDeduplicator service', () => {
  let deduplicator: RequestDeduplicator;

  beforeEach(() => {
    deduplicator = new RequestDeduplicator();
    jest.clearAllMocks();
  });

  afterEach(() => {
    deduplicator.cancelAll();
  });

  describe('module exports and constants', () => {
    it('exports expected constants and singleton instance', () => {
      expect(REQUEST_TTL).toBe(30_000);
      expect(MAX_CACHE_SIZE).toBe(100);
      expect(requestDeduplicator).toBeInstanceOf(RequestDeduplicator);
    });
  });

  describe('happy path: concurrent request deduplication', () => {
    it('collapses identical concurrent requests into a single network execution', async () => {
      const executor = jest.fn(
        async () =>
          new Promise(resolve => {
            setTimeout(() => resolve({ id: 1, name: 'Soroban 101' }), 10);
          })
      );

      const key = { method: 'GET', url: '/courses/soroban-101', params: { detail: true } };

      const [res1, res2, res3] = await Promise.all([
        deduplicator.deduplicate(key, executor),
        deduplicator.deduplicate(key, executor),
        deduplicator.deduplicate(key, executor),
      ]);

      expect(executor).toHaveBeenCalledTimes(1);
      expect(res1).toEqual({ id: 1, name: 'Soroban 101' });
      expect(res2).toEqual({ id: 1, name: 'Soroban 101' });
      expect(res3).toEqual({ id: 1, name: 'Soroban 101' });
    });

    it('exposes accurate activeCount and size properties while in-flight', async () => {
      let resolveRequest: (val: string) => void;
      const deferredPromise = new Promise<string>(resolve => {
        resolveRequest = resolve;
      });

      const key = { method: 'GET', url: '/user/profile' };
      const callPromise = deduplicator.deduplicate(key, () => deferredPromise);

      expect(deduplicator.activeCount).toBe(1);
      expect(deduplicator.size).toBe(1);

      resolveRequest!('done');
      await callPromise;

      expect(deduplicator.activeCount).toBe(0);
      expect(deduplicator.size).toBe(0);
    });

    it('allows a subsequent request to execute freshly after the first resolves', async () => {
      const executor = jest.fn().mockResolvedValue({ status: 'ok' });
      const key = { method: 'GET', url: '/health' };

      const first = await deduplicator.deduplicate(key, executor);
      const second = await deduplicator.deduplicate(key, executor);

      expect(executor).toHaveBeenCalledTimes(2);
      expect(first).toEqual({ status: 'ok' });
      expect(second).toEqual({ status: 'ok' });
    });
  });

  describe('key differentiation', () => {
    it('distinguishes requests with different methods, endpoints, or query params', async () => {
      const executor = jest.fn(async (tag: string) => ({ tag }));

      const [r1, r2, r3, r4] = await Promise.all([
        deduplicator.deduplicate({ method: 'GET', url: '/api/v1/posts' }, () =>
          executor('get-all')
        ),
        deduplicator.deduplicate({ method: 'POST', url: '/api/v1/posts' }, () =>
          executor('post-new')
        ),
        deduplicator.deduplicate({ method: 'GET', url: '/api/v1/posts', params: { page: 1 } }, () =>
          executor('get-page-1')
        ),
        deduplicator.deduplicate({ method: 'GET', url: '/api/v1/posts', params: { page: 2 } }, () =>
          executor('get-page-2')
        ),
      ]);

      expect(executor).toHaveBeenCalledTimes(4);
      expect(r1.tag).toBe('get-all');
      expect(r2.tag).toBe('post-new');
      expect(r3.tag).toBe('get-page-1');
      expect(r4.tag).toBe('get-page-2');
    });
  });

  describe('error and edge cases', () => {
    it('propagates executor rejection to all subscribers and removes key from map', async () => {
      const networkError = new Error('500 Internal Server Error');
      const executor = jest.fn(
        async () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(networkError), 10);
          })
      );

      const key = { method: 'GET', url: '/fail' };

      const [res1, res2] = await Promise.allSettled([
        deduplicator.deduplicate(key, executor),
        deduplicator.deduplicate(key, executor),
      ]);

      expect(res1.status).toBe('rejected');
      expect(res2.status).toBe('rejected');
      if (res1.status === 'rejected' && res2.status === 'rejected') {
        expect(res1.reason).toBe(networkError);
        expect(res2.reason).toBe(networkError);
      }

      // In-flight map should be cleaned up
      expect(deduplicator.size).toBe(0);

      // Subsequent call should be attempted again
      const retryExecutor = jest.fn().mockResolvedValue('recovered');
      const recovered = await deduplicator.deduplicate(key, retryExecutor);
      expect(recovered).toBe('recovered');
      expect(retryExecutor).toHaveBeenCalledTimes(1);
    });

    it('passes an AbortSignal to the executor and triggers abort on cancelAll', async () => {
      let aborted = false;
      const hangingPromise = new Promise<never>((_, reject) => {
        // Will never resolve unless aborted
      });

      const executor = jest.fn((signal: AbortSignal) => {
        signal.addEventListener('abort', () => {
          aborted = true;
        });
        return hangingPromise;
      });

      const key = { method: 'GET', url: '/hanging' };
      void deduplicator.deduplicate(key, executor).catch(() => {});

      expect(deduplicator.size).toBe(1);
      deduplicator.cancelAll();

      expect(aborted).toBe(true);
      expect(deduplicator.size).toBe(0);
    });

    it('enforces maximum cache size cap by evicting oldest entries', async () => {
      // Simulate multiple pending requests exceeding MAX_CACHE_SIZE
      const pending: Promise<unknown>[] = [];

      for (let i = 0; i <= MAX_CACHE_SIZE + 5; i++) {
        const key = { method: 'GET', url: `/item/${i}` };
        pending.push(
          deduplicator.deduplicate(
            key,
            () => new Promise<string>(resolve => setTimeout(() => resolve('ok'), 50))
          )
        );
      }

      expect(deduplicator.size).toBeLessThanOrEqual(MAX_CACHE_SIZE);
      await Promise.all(pending);
      expect(deduplicator.size).toBe(0);
    });
  });
});
