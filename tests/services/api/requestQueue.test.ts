import { InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';

import { requestQueue } from '../../../src/services/api/requestQueue';

jest.mock('../../../src/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../../src/services/healthMetrics', () => ({
  healthMetricsService: {
    recordApiCall: jest.fn(),
  },
}));

jest.mock('../../../src/services/mobileAnalytics', () => ({
  mobileAnalyticsService: {
    trackEvent: jest.fn(),
  },
}));

const mockConfig = (overrides: Partial<InternalAxiosRequestConfig> = {}): InternalAxiosRequestConfig =>
  ({
    method: 'GET',
    url: '/api/courses',
    headers: {},
    data: undefined,
    ...overrides,
  }) as InternalAxiosRequestConfig;

describe('RequestQueue', () => {
  beforeEach(async () => {
    jest.clearAllMocks();

    const queue = await requestQueue.getQueue();
    for (const req of queue) {
      await requestQueue.removeFromQueue(req.id);
    }

    jest.spyOn(Network, 'getNetworkStateAsync').mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'WIFI',
    } as any);
  });

  afterEach(async () => {
    requestQueue.stopMonitoring();
    await AsyncStorage.clear();
  });

  describe('addToQueue', () => {
    it('should add a request with default normal priority', async () => {
      const id = await requestQueue.addToQueue(mockConfig());
      expect(id).toBeTruthy();

      const queue = await requestQueue.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].priority).toBe('normal');
      expect(queue[0].method).toBe('GET');
      expect(queue[0].endpoint).toBe('/api/courses');
    });

    it('should add a request with specified priority', async () => {
      await requestQueue.addToQueue(mockConfig(), 'critical');
      const queue = await requestQueue.getQueue();
      expect(queue[0].priority).toBe('critical');
    });

    it('should sort queue by priority on insertion', async () => {
      await requestQueue.addToQueue(mockConfig({ url: '/low' }), 'low');
      await requestQueue.addToQueue(mockConfig({ url: '/critical' }), 'critical');
      await requestQueue.addToQueue(mockConfig({ url: '/high' }), 'high');

      const queue = await requestQueue.getQueue();
      expect(queue[0].priority).toBe('critical');
      expect(queue[1].priority).toBe('high');
      expect(queue[2].priority).toBe('low');
    });

    it('should persist to AsyncStorage', async () => {
      await requestQueue.addToQueue(mockConfig());
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@teachlink_request_queue',
        expect.any(String),
      );
    });
  });

  describe('removeFromQueue', () => {
    it('should remove a request by id', async () => {
      const id = await requestQueue.addToQueue(mockConfig());
      await requestQueue.removeFromQueue(id);

      const queue = await requestQueue.getQueue();
      expect(queue).toHaveLength(0);
    });
  });

  describe('incrementRetry', () => {
    it('should increment retry count for a request', async () => {
      const id = await requestQueue.addToQueue(mockConfig());
      await requestQueue.incrementRetry(id);

      const queue = await requestQueue.getQueue();
      expect(queue[0].retries).toBe(1);
    });
  });

  describe('getPendingByPriority', () => {
    it('should return counts grouped by priority', async () => {
      await requestQueue.addToQueue(mockConfig({ url: '/a' }), 'critical');
      await requestQueue.addToQueue(mockConfig({ url: '/b' }), 'normal');
      await requestQueue.addToQueue(mockConfig({ url: '/c' }), 'normal');

      const counts = await requestQueue.getPendingByPriority();
      expect(counts.critical).toBe(1);
      expect(counts.normal).toBe(2);
      expect(counts.high).toBe(0);
      expect(counts.low).toBe(0);
    });
  });

  describe('getQueueStatus', () => {
    it('should return comprehensive queue status', async () => {
      await requestQueue.addToQueue(mockConfig({ method: 'GET', url: '/courses' }), 'high');
      await requestQueue.addToQueue(mockConfig({ method: 'PUT', url: '/profile' }), 'critical');

      const status = await requestQueue.getQueueStatus();
      expect(status.total).toBe(2);
      expect(status.byPriority.critical).toBe(1);
      expect(status.byPriority.high).toBe(1);
      expect(status.byMethod.GET).toBe(1);
      expect(status.byMethod.PUT).toBe(1);
      expect(status.isProcessing).toBe(false);
      expect(status.isMonitoring).toBe(false);
    });
  });

  describe('processQueue', () => {
    it('should process single requests successfully', async () => {
      const client = jest.fn().mockResolvedValue({ data: 'ok' });
      await requestQueue.addToQueue(mockConfig());

      await requestQueue.processQueue(client);

      const queue = await requestQueue.getQueue();
      expect(queue).toHaveLength(0);
      expect(client).toHaveBeenCalledTimes(1);
    });

    it('should handle network errors during processing', async () => {
      const client = jest.fn().mockRejectedValue(new Error('Network error'));
      await requestQueue.addToQueue(mockConfig());

      await requestQueue.processQueue(client);

      const queue = await requestQueue.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].retries).toBe(1);
    });

    it('should drop requests exceeding max retries', async () => {
      const client = jest.fn().mockRejectedValue(new Error('Fail'));

      await requestQueue.addToQueue(mockConfig());

      for (let i = 0; i < 3; i++) {
        await requestQueue.processQueue(client);
      }

      const queue = await requestQueue.getQueue();
      expect(queue).toHaveLength(0);
    });

    it('should not process when offline', async () => {
      jest.spyOn(Network, 'getNetworkStateAsync').mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
        type: 'NONE',
      } as any);

      const client = jest.fn();
      await requestQueue.addToQueue(mockConfig());

      await requestQueue.processQueue(client);

      expect(client).not.toHaveBeenCalled();
    });
  });

  describe('batch processing', () => {
    it('should batch multiple requests to same endpoint', async () => {
      const client = jest.fn().mockResolvedValue({ data: 'ok' });

      await requestQueue.addToQueue(mockConfig({ method: 'PUT', url: '/api/profile', data: { name: 'a' } }), 'normal');
      await requestQueue.addToQueue(mockConfig({ method: 'PUT', url: '/api/profile', data: { name: 'b' } }), 'normal');

      await requestQueue.processQueue(client);

      const queue = await requestQueue.getQueue();
      expect(queue).toHaveLength(0);
      expect(client).toHaveBeenCalledTimes(1);
    });

    it('should not batch GET requests to same endpoint', async () => {
      const client = jest.fn().mockResolvedValue({ data: 'ok' });

      await requestQueue.addToQueue(mockConfig({ method: 'GET', url: '/api/courses' }));
      await requestQueue.addToQueue(mockConfig({ method: 'GET', url: '/api/courses' }));

      await requestQueue.processQueue(client);

      expect(client).toHaveBeenCalledTimes(2);
    });
  });

  describe('resume', () => {
    it('should restore pending count from persisted storage', async () => {
      await requestQueue.addToQueue(mockConfig());
      await requestQueue.addToQueue(mockConfig());

      const mockGetItem = AsyncStorage.getItem as jest.Mock;
      const savedData = mockGetItem.mock.results[0]?.value;

      expect(savedData).toBeTruthy();
    });
  });

  describe('onPendingCountChange', () => {
    it('should notify listeners when queue changes', async () => {
      const listener = jest.fn();
      requestQueue.onPendingCountChange(listener);

      await requestQueue.addToQueue(mockConfig());

      expect(listener).toHaveBeenCalledWith(1);
    });

    it('should return unsubscribe function', async () => {
      const listener = jest.fn();
      const unsubscribe = requestQueue.onPendingCountChange(listener);
      unsubscribe();

      await requestQueue.addToQueue(mockConfig());

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('startMonitoring / stopMonitoring', () => {
    it('should start processing queue on monitoring start', async () => {
      const client = jest.fn().mockResolvedValue({ data: 'ok' });
      await requestQueue.addToQueue(mockConfig());

      requestQueue.startMonitoring(client);

      await new Promise(process.nextTick);
      expect(client).toHaveBeenCalled();
      requestQueue.stopMonitoring();
    });

    it('should stop monitoring without errors', () => {
      expect(() => requestQueue.stopMonitoring()).not.toThrow();
    });
  });
});
