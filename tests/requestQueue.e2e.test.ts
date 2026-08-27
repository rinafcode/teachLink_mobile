import AsyncStorage from '@react-native-async-storage/async-storage';
import { InternalAxiosRequestConfig } from 'axios';
import * as Network from 'expo-network';

import { requestQueue } from '../src/services/api/requestQueue';
import * as secureStorage from '../src/services/secureStorage';
import { useAppStore } from '../src/store';

jest.mock('../src/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    errorSync: jest.fn(),
    warnSync: jest.fn(),
  },
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../src/services/mobileAnalytics', () => ({
  mobileAnalyticsService: { trackEvent: jest.fn() },
}));

jest.mock('../src/services/secureStorage', () => ({
  isSessionValid: jest.fn(() => Promise.resolve(true)),
  refreshAccessToken: jest.fn(),
}));

jest.mock('../src/store', () => ({
  useAppStore: {
    getState: jest.fn(() => ({
      logout: jest.fn(),
      setTokens: jest.fn(),
    })),
  },
}));

const mockConfig = (
  overrides: Partial<InternalAxiosRequestConfig> = {}
): InternalAxiosRequestConfig =>
  ({
    method: 'GET',
    url: '/api/courses',
    headers: {},
    data: undefined,
    ...overrides,
  }) as InternalAxiosRequestConfig;

const mockStore: Record<string, string> = {};

function setupAsyncStorageMock() {
  (AsyncStorage.setItem as jest.Mock).mockImplementation((key: string, value: string) => {
    mockStore[key] = value;
    return Promise.resolve();
  });
  (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) =>
    Promise.resolve(mockStore[key] ?? null)
  );
  (AsyncStorage.removeItem as jest.Mock).mockImplementation((key: string) => {
    delete mockStore[key];
    return Promise.resolve();
  });
}

describe('requestQueue offline-to-online sync E2E (#840)', () => {
  const mockIsSessionValid = secureStorage.isSessionValid as jest.MockedFunction<
    typeof secureStorage.isSessionValid
  >;
  const mockRefresh = secureStorage.refreshAccessToken as jest.MockedFunction<
    typeof secureStorage.refreshAccessToken
  >;
  const mockLogout = jest.fn();
  const mockSetTokens = jest.fn();

  beforeEach(async () => {
    Object.keys(mockStore).forEach(k => delete mockStore[k]);
    setupAsyncStorageMock();
    mockLogout.mockReset();
    mockSetTokens.mockReset();
    mockIsSessionValid.mockResolvedValue(true);
    mockRefresh.mockResolvedValue({
      accessToken: 'fresh-access-token',
      refreshToken: 'fresh-refresh-token',
      expiresAt: Date.now() + 3_600_000,
    });
    (useAppStore.getState as jest.Mock).mockReturnValue({
      logout: mockLogout,
      setTokens: mockSetTokens,
    });

    jest.spyOn(Network, 'getNetworkStateAsync').mockResolvedValue({
      isConnected: false,
      isInternetReachable: false,
      type: 'NONE',
    } as any);
  });

  afterEach(async () => {
    requestQueue.stopMonitoring();
    jest.restoreAllMocks();
  });

  function goOnline() {
    jest.spyOn(Network, 'getNetworkStateAsync').mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'WIFI',
    } as any);
  }

  it('queues requests while offline, drains them in FIFO order after reconnect', async () => {
    const callOrder: string[] = [];
    const client = jest.fn().mockImplementation((cfg: InternalAxiosRequestConfig) => {
      callOrder.push(cfg.url!);
      return Promise.resolve({ data: 'ok' });
    });

    const id1 = await requestQueue.addToQueue(mockConfig({ url: '/api/a', method: 'POST' }));
    const id2 = await requestQueue.addToQueue(mockConfig({ url: '/api/b', method: 'POST' }));
    const id3 = await requestQueue.addToQueue(mockConfig({ url: '/api/c', method: 'POST' }));

    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id3).toBeTruthy();

    let queue = await requestQueue.getQueue();
    expect(queue).toHaveLength(3);

    await requestQueue.processQueue(client);
    expect(client).not.toHaveBeenCalled();

    queue = await requestQueue.getQueue();
    expect(queue).toHaveLength(3);

    goOnline();
    await requestQueue.processQueue(client);

    expect(client).toHaveBeenCalledTimes(3);
    expect(callOrder).toEqual(['/api/a', '/api/b', '/api/c']);

    queue = await requestQueue.getQueue();
    expect(queue).toHaveLength(0);
  });

  it('preserves FIFO within the same priority level', async () => {
    const client = jest.fn().mockResolvedValue({ data: 'ok' });

    await requestQueue.addToQueue(mockConfig({ url: '/first' }), 'normal');
    await requestQueue.addToQueue(mockConfig({ url: '/second' }), 'normal');
    await requestQueue.addToQueue(mockConfig({ url: '/third' }), 'normal');

    goOnline();
    await requestQueue.processQueue(client);

    expect(client).toHaveBeenCalledTimes(3);
    expect(client.mock.calls[0][0].url).toBe('/first');
    expect(client.mock.calls[1][0].url).toBe('/second');
    expect(client.mock.calls[2][0].url).toBe('/third');
  });

  it('batches multiple PUT requests to the same endpoint into one call', async () => {
    const client = jest.fn().mockResolvedValue({ data: 'ok' });

    await requestQueue.addToQueue(
      mockConfig({ method: 'PUT', url: '/api/profile', data: { name: 'a' } })
    );
    await requestQueue.addToQueue(
      mockConfig({ method: 'PUT', url: '/api/profile', data: { name: 'b' } })
    );

    goOnline();
    await requestQueue.processQueue(client);

    expect(client).toHaveBeenCalledTimes(1);
  });

  it('retries failed requests and eventually drops after max retries', async () => {
    const client = jest.fn().mockRejectedValue(new Error('Server 500'));

    await requestQueue.addToQueue(mockConfig({ url: '/flaky' }));
    goOnline();

    await requestQueue.processQueue(client);
    let queue = await requestQueue.getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].retries).toBe(1);

    await requestQueue.processQueue(client);
    queue = await requestQueue.getQueue();
    expect(queue[0].retries).toBe(2);

    await requestQueue.processQueue(client);
    queue = await requestQueue.getQueue();
    expect(queue[0].retries).toBe(3);

    await requestQueue.processQueue(client);
    queue = await requestQueue.getQueue();
    expect(queue).toHaveLength(0);
  });

  it('processes critical requests before low-priority ones', async () => {
    const callOrder: string[] = [];
    const client = jest.fn().mockImplementation((cfg: InternalAxiosRequestConfig) => {
      callOrder.push(cfg.url!);
      return Promise.resolve({ data: 'ok' });
    });

    await requestQueue.addToQueue(mockConfig({ url: '/low-1' }), 'low');
    await requestQueue.addToQueue(mockConfig({ url: '/critical-1' }), 'critical');
    await requestQueue.addToQueue(mockConfig({ url: '/normal-1' }), 'normal');

    goOnline();
    await requestQueue.processQueue(client);

    expect(callOrder[0]).toBe('/critical-1');
    expect(callOrder[2]).toBe('/low-1');
  });

  it('clears queue and logs out when session refresh fails', async () => {
    mockIsSessionValid.mockResolvedValue(false);
    mockRefresh.mockRejectedValue(new Error('Refresh failed'));

    const client = jest.fn().mockResolvedValue({ data: 'ok' });
    await requestQueue.addToQueue(mockConfig());

    goOnline();
    await requestQueue.processQueue(client);

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(client).not.toHaveBeenCalled();

    const queue = await requestQueue.getQueue();
    expect(queue).toHaveLength(0);
  });

  // ─── Deduplication tests ────────────────────────────────────────────────

  it('suppresses duplicate POST requests sharing the same method+URL+body', async () => {
    const id1 = await requestQueue.addToQueue(
      mockConfig({ method: 'POST', url: '/api/notes', data: { title: 'A' } })
    );
    const id2 = await requestQueue.addToQueue(
      mockConfig({ method: 'POST', url: '/api/notes', data: { title: 'A' } })
    );

    // Second call returns the existing id, not a new one
    expect(id2).toBe(id1);

    const queue = await requestQueue.getQueue();
    expect(queue).toHaveLength(1);
  });

  it('allows duplicate POST requests with different bodies', async () => {
    await requestQueue.addToQueue(
      mockConfig({ method: 'POST', url: '/api/notes', data: { title: 'A' } })
    );
    await requestQueue.addToQueue(
      mockConfig({ method: 'POST', url: '/api/notes', data: { title: 'B' } })
    );

    const queue = await requestQueue.getQueue();
    expect(queue).toHaveLength(2);
  });

  it('collapses GET requests: replaces older entry with the newest', async () => {
    await requestQueue.addToQueue(
      mockConfig({ method: 'GET', url: '/api/feed' })
    );
    await requestQueue.addToQueue(
      mockConfig({ method: 'GET', url: '/api/feed' })
    );
    await requestQueue.addToQueue(
      mockConfig({ method: 'GET', url: '/api/feed' })
    );

    const queue = await requestQueue.getQueue();
    // GETs are collapsed to one entry (the most recent)
    expect(queue).toHaveLength(1);
  });

  it('reconnection does not produce duplicate writes for idempotent POSTs', async () => {
    const client = jest.fn().mockResolvedValue({ data: 'ok' });

    // Simulate the same POST being queued multiple times during offline
    await requestQueue.addToQueue(
      mockConfig({ method: 'POST', url: '/api/enroll', data: { courseId: 'c1' } })
    );
    await requestQueue.addToQueue(
      mockConfig({ method: 'POST', url: '/api/enroll', data: { courseId: 'c1' } })
    );

    goOnline();
    await requestQueue.processQueue(client);

    // Only one network call should have been made
    expect(client).toHaveBeenCalledTimes(1);
  });

  // ─── MAX_QUEUE_SIZE eviction tests ──────────────────────────────────────

  it('evicts oldest low-priority requests when queue exceeds MAX_QUEUE_SIZE', async () => {
    // Fill queue with 100 low-priority requests
    for (let i = 0; i < 100; i++) {
      await requestQueue.addToQueue(
        mockConfig({ url: `/api/item-${i}` }),
        'low'
      );
    }

    let queue = await requestQueue.getQueue();
    expect(queue).toHaveLength(100);

    // Adding one more should evict the oldest low-priority entry
    await requestQueue.addToQueue(
      mockConfig({ url: '/api/item-new' }),
      'low'
    );

    queue = await requestQueue.getQueue();
    expect(queue).toHaveLength(100);

    // The oldest entry (/api/item-0) should have been evicted
    expect(queue.find(r => r.endpoint === '/api/item-0')).toBeUndefined();
    // The newest entry should be present
    expect(queue.find(r => r.endpoint === '/api/item-new')).toBeTruthy();
  });

  it('never evicts critical requests even when queue is full', async () => {
    // Fill queue with 100 low-priority requests
    for (let i = 0; i < 100; i++) {
      await requestQueue.addToQueue(
        mockConfig({ url: `/api/low-${i}` }),
        'low'
      );
    }

    // Add a critical request — queue is already full
    await requestQueue.addToQueue(
      mockConfig({ url: '/api/critical-payment' }),
      'critical'
    );

    const queue = await requestQueue.getQueue();
    // Critical request should always be present
    expect(queue.find(r => r.endpoint === '/api/critical-payment')).toBeTruthy();
  });

  it('tracks dropped request count', async () => {
    const initialDropped = requestQueue.getDroppedCount();

    // Fill queue past capacity
    for (let i = 0; i < 101; i++) {
      await requestQueue.addToQueue(
        mockConfig({ url: `/api/items-${i}` }),
        'low'
      );
    }

    expect(requestQueue.getDroppedCount()).toBeGreaterThanOrEqual(initialDropped + 1);
  });
});
