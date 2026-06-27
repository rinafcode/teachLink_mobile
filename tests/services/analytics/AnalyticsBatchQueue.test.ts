import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';

import { AnalyticsBatchQueue } from '../../../src/services/analytics/AnalyticsBatchQueue';
import apiClient from '../../../src/services/api/axios.config';
import { AnalyticsEvent } from '../../../src/utils/trackingEvents';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    setItem: jest.fn((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    getItem: jest.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    removeItem: jest.fn((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      store.clear();
      return Promise.resolve();
    }),
    getAllKeys: jest.fn(() => Promise.resolve(Array.from(store.keys()))),
    multiGet: jest.fn(() => Promise.resolve([])),
    multiSet: jest.fn(() => Promise.resolve()),
  };
});

jest.mock('../../../src/services/api/axios.config', () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => Promise.resolve({ data: {} })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    put: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
  },
}));

jest.mock('../../../src/utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  appLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const STORAGE_KEY = '@analytics/pending';

describe('AnalyticsBatchQueue', () => {
  let queue: AnalyticsBatchQueue;

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    jest.useFakeTimers();
    queue = new AnalyticsBatchQueue();
  });

  afterEach(() => {
    queue.destroy();
    jest.useRealTimers();
  });

  describe('batch accumulation', () => {
    it('buffers events in memory below the threshold', () => {
      for (let i = 0; i < 15; i++) {
        queue.enqueue(AnalyticsEvent.UI_CLICK, { idx: i });
      }
      expect(queue.size).toBe(15);
      expect(apiClient.post).not.toHaveBeenCalled();
    });

    it('flushes when batch reaches 20 events', async () => {
      for (let i = 0; i < 20; i++) {
        queue.enqueue(AnalyticsEvent.UI_CLICK, { idx: i });
      }
      expect(queue.size).toBe(0);
      await queue.flush();
      expect(apiClient.post).toHaveBeenCalledTimes(1);
    });

    it('flushes after 30 seconds via timer', async () => {
      queue.enqueue(AnalyticsEvent.UI_CLICK);

      expect(queue.size).toBe(1);
      expect(apiClient.post).not.toHaveBeenCalled();

      jest.advanceTimersByTime(30000);
      await queue.flush();

      expect(queue.size).toBe(0);
      expect(apiClient.post).toHaveBeenCalledTimes(1);
    });

    it('sends all 20 events in a single POST request', async () => {
      for (let i = 0; i < 20; i++) {
        queue.enqueue(AnalyticsEvent.UI_CLICK, { idx: i });
      }
      await queue.flush();

      expect(apiClient.post).toHaveBeenCalledWith('/analytics/events', {
        events: expect.arrayContaining([
          expect.objectContaining({ event: AnalyticsEvent.UI_CLICK }),
        ]),
      });

      const callArg = (apiClient.post as jest.Mock).mock.calls[0][1];
      expect(callArg.events).toHaveLength(20);
    });

    it('does not flush when buffer is empty', async () => {
      await queue.flush();
      expect(apiClient.post).not.toHaveBeenCalled();
    });
  });

  describe('timer management', () => {
    it('does not start a second timer when event is enqueued while timer is pending', () => {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      queue.enqueue(AnalyticsEvent.UI_CLICK);
      queue.enqueue(AnalyticsEvent.SCREEN_VIEW);
      queue.enqueue(AnalyticsEvent.BUTTON_CLICK);

      expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
      setTimeoutSpy.mockRestore();
    });

    it('resets timer after a successful flush', async () => {
      for (let i = 0; i < 20; i++) {
        queue.enqueue(AnalyticsEvent.UI_CLICK);
      }
      await queue.flush();

      expect(queue.size).toBe(0);

      queue.enqueue(AnalyticsEvent.UI_CLICK);
      expect(queue.size).toBe(1);
    });
  });

  describe('failure persistence', () => {
    it('persists failed batch to AsyncStorage with retryCount 1', async () => {
      (apiClient.post as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      for (let i = 0; i < 20; i++) {
        queue.enqueue(AnalyticsEvent.UI_CLICK);
      }
      await queue.flush();

      const stored = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY))!);
      expect(stored.retryCount).toBe(1);
      expect(stored.events).toHaveLength(20);
    });

    it('includes stored batch on next flush', async () => {
      (apiClient.post as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      for (let i = 0; i < 20; i++) {
        queue.enqueue(AnalyticsEvent.UI_CLICK, { idx: i, batch: 1 });
      }
      await queue.flush();

      (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: {} });
      for (let i = 0; i < 5; i++) {
        queue.enqueue(AnalyticsEvent.UI_CLICK, { idx: i, batch: 2 });
      }
      await queue.flush();

      expect(apiClient.post).toHaveBeenCalledTimes(2);
      const callArg = (apiClient.post as jest.Mock).mock.calls[1][1];
      expect(callArg.events).toHaveLength(25);
    });

    it('clears stored batch on successful flush', async () => {
      (apiClient.post as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      for (let i = 0; i < 20; i++) {
        queue.enqueue(AnalyticsEvent.UI_CLICK);
      }
      await queue.flush();

      (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: {} });
      await queue.flush();

      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      expect(stored).toBeNull();
    });
  });

  describe('retry and dead letter', () => {
    it('drops batch after 5 retries and sends Sentry warning', async () => {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          events: [
            { event: AnalyticsEvent.UI_CLICK, properties: {}, timestamp: new Date().toISOString() },
          ],
          retryCount: 5,
        })
      );

      (apiClient.post as jest.Mock).mockRejectedValue(new Error('Network error'));
      await queue.flush();

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        expect.stringContaining('dropped after 5'),
        'warning'
      );
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      expect(stored).toBeNull();
    });

    it('increments retry count on each failure', async () => {
      (apiClient.post as jest.Mock).mockRejectedValue(new Error('Network error'));
      for (let i = 0; i < 20; i++) {
        queue.enqueue(AnalyticsEvent.UI_CLICK);
      }

      await queue.flush();
      let stored = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY))!);
      expect(stored.retryCount).toBe(1);

      (apiClient.post as jest.Mock).mockClear();
      (apiClient.post as jest.Mock).mockRejectedValue(new Error('Network error'));
      await queue.flush();

      stored = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY))!);
      expect(stored.retryCount).toBe(2);
    });

    it('applies exponential backoff between retries', async () => {
      (apiClient.post as jest.Mock).mockRejectedValue(new Error('Network error'));
      for (let i = 0; i < 20; i++) {
        queue.enqueue(AnalyticsEvent.UI_CLICK);
      }
      await queue.flush();

      (apiClient.post as jest.Mock).mockClear();

      jest.advanceTimersByTime(999);
      expect(apiClient.post).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1);
      await queue.flush();
      expect(apiClient.post).toHaveBeenCalledTimes(1);
    });

    it('caps exponential backoff at 30 seconds', async () => {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          events: [
            { event: AnalyticsEvent.UI_CLICK, properties: {}, timestamp: new Date().toISOString() },
          ],
          retryCount: 15,
        })
      );

      (apiClient.post as jest.Mock).mockRejectedValue(new Error('Network error'));
      await queue.flush();

      expect(apiClient.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('destroy', () => {
    it('clears any pending timer on destroy', () => {
      queue.enqueue(AnalyticsEvent.UI_CLICK);
      queue.destroy();

      jest.advanceTimersByTime(30000);
      expect(apiClient.post).not.toHaveBeenCalled();
    });
  });
});
