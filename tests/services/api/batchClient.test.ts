/* Test suite for network request batching (Issue #367)
 * Coverage: window accumulation, single-request dispatch, response mapping,
 * partial failures, fallback on batch endpoint failure, metrics tracking.
 */

jest.mock('../../../src/services/api/axios.config', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../../../src/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Import after mocks are established
import { batchClient } from '../../../src/services/api/batchClient';
import apiClient from '../../../src/services/api/axios.config';

const mockPost = apiClient.post as jest.Mock;
const mockPut = apiClient.put as jest.Mock;
const mockDelete = apiClient.delete as jest.Mock;

describe('BatchClient', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    batchClient._reset();
  });

  afterEach(() => {
    batchClient._reset();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // Window accumulation
  // ---------------------------------------------------------------------------
  describe('window accumulation', () => {
    it('accumulates multiple mutate() calls within the window into one batch', async () => {
      mockPost.mockResolvedValueOnce({
        data: [
          { status: 201, body: { id: 1 } },
          { status: 200, body: { id: 2 } },
        ],
      });

      const p1 = batchClient.mutate('POST', '/courses', { title: 'A' });
      const p2 = batchClient.mutate('PUT', '/courses/1', { title: 'B' });

      jest.runAllTimers();
      const [r1, r2] = await Promise.all([p1, p2]);

      expect(mockPost).toHaveBeenCalledTimes(1);
      expect(mockPost).toHaveBeenCalledWith('/api/batch', [
        { method: 'POST', url: '/courses', body: { title: 'A' } },
        { method: 'PUT', url: '/courses/1', body: { title: 'B' } },
      ]);
      expect(r1).toEqual({ id: 1 });
      expect(r2).toEqual({ id: 2 });
    });

    it('dispatches immediately when maxBatchSize is reached without waiting for timer', async () => {
      const client = new (batchClient.constructor as any)({ windowMs: 5000, maxBatchSize: 2 });
      client._reset();

      mockPost.mockResolvedValueOnce({
        data: [
          { status: 200, body: 'a' },
          { status: 200, body: 'b' },
        ],
      });

      const p1 = client.mutate('POST', '/x', {});
      const p2 = client.mutate('POST', '/y', {});

      // No timer advancement needed — should have dispatched synchronously on the 2nd call
      await Promise.all([p1, p2]);

      expect(mockPost).toHaveBeenCalledTimes(1);
    });

    it('starts a fresh window after each flush', async () => {
      mockPost
        .mockResolvedValueOnce({ data: [{ status: 200, body: 'first' }] })
        .mockResolvedValueOnce({ data: [{ status: 200, body: 'second' }] });

      const p1 = batchClient.mutate('POST', '/a', {});
      jest.runAllTimers();
      await p1;

      const p2 = batchClient.mutate('POST', '/b', {});
      jest.runAllTimers();
      await p2;

      expect(mockPost).toHaveBeenCalledTimes(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Single HTTP request dispatch
  // ---------------------------------------------------------------------------
  describe('single HTTP request dispatch', () => {
    it('sends exactly one POST /api/batch for multiple mutations in the window', async () => {
      mockPost.mockResolvedValueOnce({
        data: [
          { status: 200, body: null },
          { status: 204, body: null },
          { status: 201, body: { id: 99 } },
        ],
      });

      const promises = [
        batchClient.mutate('PUT', '/notes/1', { text: 'hi' }),
        batchClient.mutate('DELETE', '/notes/2'),
        batchClient.mutate('POST', '/notes', { text: 'new' }),
      ];

      jest.runAllTimers();
      await Promise.all(promises);

      expect(mockPost).toHaveBeenCalledTimes(1);
      expect(mockPost.mock.calls[0][0]).toBe('/api/batch');
    });

    it('request body contains all requests in the order mutate() was called', async () => {
      mockPost.mockResolvedValueOnce({
        data: [
          { status: 200, body: null },
          { status: 200, body: null },
        ],
      });

      const p1 = batchClient.mutate('POST', '/first', { seq: 1 });
      const p2 = batchClient.mutate('PUT', '/second', { seq: 2 });

      jest.runAllTimers();
      await Promise.all([p1, p2]);

      const body = mockPost.mock.calls[0][1];
      expect(body[0]).toEqual({ method: 'POST', url: '/first', body: { seq: 1 } });
      expect(body[1]).toEqual({ method: 'PUT', url: '/second', body: { seq: 2 } });
    });
  });

  // ---------------------------------------------------------------------------
  // Response mapping
  // ---------------------------------------------------------------------------
  describe('response mapping', () => {
    it('resolves each Promise with the matching response body by index', async () => {
      mockPost.mockResolvedValueOnce({
        data: [
          { status: 200, body: { name: 'Alice' } },
          { status: 201, body: { name: 'Bob' } },
        ],
      });

      const p1 = batchClient.mutate('POST', '/users', { name: 'Alice' });
      const p2 = batchClient.mutate('POST', '/users', { name: 'Bob' });

      jest.runAllTimers();
      const [r1, r2] = await Promise.all([p1, p2]);

      expect(r1).toEqual({ name: 'Alice' });
      expect(r2).toEqual({ name: 'Bob' });
    });

    it('rejects Promises whose response status is >= 400', async () => {
      mockPost.mockResolvedValueOnce({
        data: [{ status: 422, body: { error: 'Unprocessable' } }],
      });

      const p = batchClient.mutate('POST', '/bad', {});
      jest.runAllTimers();

      await expect(p).rejects.toEqual({ status: 422, body: { error: 'Unprocessable' } });
    });

    it('handles mixed success and failure in the same batch', async () => {
      mockPost.mockResolvedValueOnce({
        data: [
          { status: 200, body: { ok: true } },
          { status: 404, body: { error: 'not found' } },
          { status: 201, body: { created: true } },
        ],
      });

      const p1 = batchClient.mutate('POST', '/a', {});
      const p2 = batchClient.mutate('DELETE', '/b');
      const p3 = batchClient.mutate('PUT', '/c', {});

      jest.runAllTimers();
      const results = await Promise.allSettled([p1, p2, p3]);

      expect(results[0]).toEqual({ status: 'fulfilled', value: { ok: true } });
      expect(results[1]).toEqual({
        status: 'rejected',
        reason: { status: 404, body: { error: 'not found' } },
      });
      expect(results[2]).toEqual({ status: 'fulfilled', value: { created: true } });
    });

    it('rejects unmatched entries when server returns fewer responses than requests', async () => {
      mockPost.mockResolvedValueOnce({
        data: [{ status: 200, body: 'only one' }],
      });

      const p1 = batchClient.mutate('POST', '/a', {});
      const p2 = batchClient.mutate('POST', '/b', {});

      jest.runAllTimers();
      const [r1, r2] = await Promise.allSettled([p1, p2]);

      expect(r1.status).toBe('fulfilled');
      expect(r2.status).toBe('rejected');
      expect((r2 as PromiseRejectedResult).reason.message).toMatch(/mismatch/i);
    });
  });

  // ---------------------------------------------------------------------------
  // Fallback on batch endpoint failure
  // ---------------------------------------------------------------------------
  describe('fallback on batch endpoint failure', () => {
    it('falls back to individual calls when the batch POST throws', async () => {
      mockPost
        .mockRejectedValueOnce(new Error('network error')) // batch call fails
        .mockResolvedValueOnce({ data: { id: 1 } }) // individual fallback for /a
        .mockResolvedValueOnce({ data: { id: 2 } }); // individual fallback for /b

      const p1 = batchClient.mutate('POST', '/a', { x: 1 });
      const p2 = batchClient.mutate('POST', '/b', { x: 2 });

      jest.runAllTimers();
      const [r1, r2] = await Promise.all([p1, p2]);

      // 1 batch attempt + 2 individual fallbacks
      expect(mockPost).toHaveBeenCalledTimes(3);
      expect(r1).toEqual({ id: 1 });
      expect(r2).toEqual({ id: 2 });
    });

    it('uses the correct HTTP method for each entry in fallback', async () => {
      mockPost.mockRejectedValueOnce(new Error('batch failed'));
      mockPost.mockResolvedValueOnce({ data: 'post-result' });
      mockPut.mockResolvedValueOnce({ data: 'put-result' });
      mockDelete.mockResolvedValueOnce({ data: null });

      const p1 = batchClient.mutate('POST', '/create', { a: 1 });
      const p2 = batchClient.mutate('PUT', '/update/1', { b: 2 });
      const p3 = batchClient.mutate('DELETE', '/remove/1');

      jest.runAllTimers();
      await Promise.allSettled([p1, p2, p3]);

      expect(mockPut).toHaveBeenCalledWith('/update/1', { b: 2 });
      expect(mockDelete).toHaveBeenCalledWith('/remove/1');
    });

    it('all entries are attempted even if some individual fallback calls fail', async () => {
      mockPost
        .mockRejectedValueOnce(new Error('batch failed'))
        .mockRejectedValueOnce(new Error('individual failed'));
      mockPut.mockResolvedValueOnce({ data: 'ok' });

      const p1 = batchClient.mutate('POST', '/a', {});
      const p2 = batchClient.mutate('PUT', '/b', {});

      jest.runAllTimers();
      const [r1, r2] = await Promise.allSettled([p1, p2]);

      expect(r1.status).toBe('rejected');
      expect(r2.status).toBe('fulfilled');
    });

    it('triggers fallback when server returns a non-array response', async () => {
      mockPost
        .mockResolvedValueOnce({ data: { notAnArray: true } }) // batch returns wrong shape
        .mockResolvedValueOnce({ data: 'fallback-result' });

      const p = batchClient.mutate('POST', '/a', {});

      jest.runAllTimers();
      const result = await p;

      expect(result).toBe('fallback-result');
      expect(mockPost).toHaveBeenCalledTimes(2);
    });
  });

  // ---------------------------------------------------------------------------
  // flush()
  // ---------------------------------------------------------------------------
  describe('flush()', () => {
    it('sends queued mutations immediately without waiting for the timer', async () => {
      mockPost.mockResolvedValueOnce({ data: [{ status: 200, body: 'done' }] });

      const p = batchClient.mutate('POST', '/instant', {});
      await batchClient.flush();
      const result = await p;

      // Timer was never advanced
      expect(mockPost).toHaveBeenCalledTimes(1);
      expect(result).toBe('done');
    });

    it('is safe to call when the queue is empty', async () => {
      await expect(batchClient.flush()).resolves.toBeUndefined();
      expect(mockPost).not.toHaveBeenCalled();
    });

    it('cancels any pending timer when called', async () => {
      mockPost.mockResolvedValueOnce({ data: [{ status: 200, body: null }] });

      const p = batchClient.mutate('POST', '/a', {});
      await batchClient.flush(); // cancels timer, dispatches now
      await p;

      // Advancing timers should NOT trigger a second dispatch
      jest.runAllTimers();
      expect(mockPost).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Metrics tracking
  // ---------------------------------------------------------------------------
  describe('metrics tracking', () => {
    it('increments totalRequests for each mutate() call', () => {
      // Do not flush — just enqueue
      batchClient.mutate('POST', '/a', {});
      batchClient.mutate('POST', '/b', {});

      expect(batchClient.getMetrics().totalRequests).toBe(2);
    });

    it('increments totalBatched by the number of requests in each flush', async () => {
      mockPost.mockResolvedValueOnce({
        data: [
          { status: 200, body: null },
          { status: 200, body: null },
        ],
      });

      const p1 = batchClient.mutate('POST', '/a', {});
      const p2 = batchClient.mutate('POST', '/b', {});
      jest.runAllTimers();
      await Promise.all([p1, p2]);

      expect(batchClient.getMetrics().totalBatched).toBe(2);
    });

    it('roundtripsReduced equals batched entries minus number of HTTP calls', async () => {
      mockPost.mockResolvedValueOnce({
        data: [
          { status: 200, body: null },
          { status: 200, body: null },
          { status: 200, body: null },
        ],
      });

      const promises = [
        batchClient.mutate('POST', '/a', {}),
        batchClient.mutate('POST', '/b', {}),
        batchClient.mutate('POST', '/c', {}),
      ];
      jest.runAllTimers();
      await Promise.all(promises);

      // 3 requests → 1 HTTP call → 2 roundtrips saved
      expect(batchClient.getMetrics().roundtripsReduced).toBe(2);
    });

    it('adjusts roundtripsReduced correctly when fallback is triggered', async () => {
      mockPost
        .mockRejectedValueOnce(new Error('batch failed'))
        .mockResolvedValueOnce({ data: null })
        .mockResolvedValueOnce({ data: null });

      const p1 = batchClient.mutate('POST', '/a', {});
      const p2 = batchClient.mutate('POST', '/b', {});
      jest.runAllTimers();
      await Promise.allSettled([p1, p2]);

      // 2 entries → batch credited +1, fallback debits -1 → net 0
      expect(batchClient.getMetrics().roundtripsReduced).toBe(0);
    });

    it('getMetrics() returns a snapshot and not a live reference', () => {
      const snap1 = batchClient.getMetrics();
      batchClient.mutate('POST', '/a', {});
      const snap2 = batchClient.getMetrics();

      expect(snap1.totalRequests).toBe(0);
      expect(snap2.totalRequests).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------
  describe('edge cases', () => {
    it('handles DELETE requests that have no body', async () => {
      mockPost.mockResolvedValueOnce({
        data: [{ status: 204, body: null }],
      });

      const p = batchClient.mutate('DELETE', '/items/42');
      jest.runAllTimers();
      const result = await p;

      expect(result).toBeNull();
      expect(mockPost.mock.calls[0][1][0]).toEqual({
        method: 'DELETE',
        url: '/items/42',
        body: undefined,
      });
    });

    it('does not call delete with a body in the fallback path', async () => {
      mockPost.mockRejectedValueOnce(new Error('batch failed'));
      mockDelete.mockResolvedValueOnce({ data: null });

      const p = batchClient.mutate('DELETE', '/items/99');
      jest.runAllTimers();
      await p;

      expect(mockDelete).toHaveBeenCalledWith('/items/99');
      // delete() must not receive a second body argument
      expect(mockDelete.mock.calls[0].length).toBe(1);
    });

    it('second flush() on an empty queue is a no-op', async () => {
      mockPost.mockResolvedValueOnce({ data: [{ status: 200, body: null }] });

      const p = batchClient.mutate('POST', '/a', {});
      await batchClient.flush();
      await p;

      await batchClient.flush(); // second flush — queue is empty
      expect(mockPost).toHaveBeenCalledTimes(1);
    });

    it('mutate() calls arriving during an in-flight dispatch go into the next batch', async () => {
      let resolveBatch!: (v: any) => void;
      mockPost
        .mockImplementationOnce(
          () =>
            new Promise(res => {
              resolveBatch = res;
            })
        )
        .mockResolvedValueOnce({ data: [{ status: 200, body: 'second-batch' }] });

      const p1 = batchClient.mutate('POST', '/a', {});
      jest.runAllTimers(); // triggers first dispatch (in-flight)

      // Enqueue a second mutation while first batch is still in-flight
      const p2 = batchClient.mutate('POST', '/b', {});

      // Resolve the first batch
      resolveBatch({ data: [{ status: 200, body: 'first-batch' }] });
      await p1;

      // Second mutation should still be pending; flush it
      jest.runAllTimers();
      const result2 = await p2;

      expect(mockPost).toHaveBeenCalledTimes(2);
      expect(result2).toBe('second-batch');
    });
  });
});
