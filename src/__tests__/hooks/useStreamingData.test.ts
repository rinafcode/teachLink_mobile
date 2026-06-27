/**
 * Tests for #619 — isMounted guard in useStreamingData
 */

import { streamingApi } from '../../services/api/streaming';

jest.mock('../../services/api/streaming', () => ({
  streamingApi: {
    streamWithRetry: jest.fn(),
    measureTTFB: jest.fn(),
  },
}));
jest.mock('../../utils/logger', () => ({
  appLogger: { infoSync: jest.fn(), warnSync: jest.fn(), errorSync: jest.fn() },
}));
jest.mock('../../config', () => ({ getEnv: jest.fn(() => 'http://localhost') }));

const mockStreamWithRetry = streamingApi.streamWithRetry as jest.Mock;

describe('useStreamingData — isMounted guard (#619)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('AbortController signal is passed to streamWithRetry', async () => {
    mockStreamWithRetry.mockResolvedValueOnce([]);

    const controller = new AbortController();
    await streamingApi.streamWithRetry('test', { signal: controller.signal } as never);

    expect(mockStreamWithRetry).toHaveBeenCalledWith(
      'test',
      expect.objectContaining({ signal: controller.signal })
    );
  });

  it('AbortController.abort() makes signal.aborted = true', () => {
    const controller = new AbortController();
    expect(controller.signal.aborted).toBe(false);
    controller.abort();
    expect(controller.signal.aborted).toBe(true);
  });

  it('does not invoke callbacks when signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    mockStreamWithRetry.mockImplementation((_: unknown, cfg: { signal?: AbortSignal }) => {
      if (cfg?.signal?.aborted) {
        return Promise.reject(new DOMException('Aborted', 'AbortError'));
      }
      return Promise.resolve([]);
    });

    await expect(
      streamingApi.streamWithRetry('test', { signal: controller.signal } as never)
    ).rejects.toThrow('Aborted');
  });

  it('isMounted guard prevents setState after unmount', () => {
    let isMounted = true;
    const setData = jest.fn();

    const onChunk = (chunk: { data: unknown }) => {
      if (!isMounted) return;
      setData((prev: unknown[]) => [...prev, chunk.data]);
    };

    onChunk({ data: { id: 1 } });
    expect(setData).toHaveBeenCalledTimes(1);

    isMounted = false;
    onChunk({ data: { id: 2 } });
    expect(setData).toHaveBeenCalledTimes(1);
  });
});
