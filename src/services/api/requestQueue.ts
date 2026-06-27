import AsyncStorage from '@react-native-async-storage/async-storage';
import { InternalAxiosRequestConfig } from 'axios';
import * as Network from 'expo-network';

import logger from '../../utils/logger';
import { healthMetricsService } from '../healthMetrics';
import { mobileAnalyticsService } from '../mobileAnalytics';

export type RequestPriority = 'critical' | 'high' | 'normal' | 'low';

export interface QueuedRequest {
  id: string;
  config: InternalAxiosRequestConfig;
  timestamp: number;
  retries: number;
  maxRetries: number;
  priority: RequestPriority;
  endpoint: string;
  method: string;
}

interface BatchGroup {
  method: string;
  endpoint: string;
  requests: QueuedRequest[];
}

interface QueueMetrics {
  totalQueued: number;
  byPriority: Record<RequestPriority, number>;
  byMethod: Record<string, number>;
  totalRetries: number;
  lastSyncTimestamp: number | null;
  batchesFormed: number;
}

const QUEUE_KEY = '@teachlink_request_queue';
const QUEUE_METRICS_KEY = '@teachlink_request_queue_metrics';
const MONITOR_INTERVAL_MS = 10000;
const PRIORITY_ORDER: Record<RequestPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

class RequestQueue {
  private readonly MAX_RETRIES = 3;
  private isProcessing = false;
  private listeners: ((count: number) => void)[] = [];
  private monitoringInterval: ReturnType<typeof setInterval> | null = null;
  private networkListener: (() => void) | null = null;
  private apiClient: any | null = null;
  private metrics: QueueMetrics = {
    totalQueued: 0,
    byPriority: { critical: 0, high: 0, normal: 0, low: 0 },
    byMethod: {},
    totalRetries: 0,
    lastSyncTimestamp: null,
    batchesFormed: 0,
  };

  async addToQueue(
    config: InternalAxiosRequestConfig,
    priority: RequestPriority = 'normal',
  ): Promise<string> {
    try {
      const queue = await this.getQueue();
      const method = (config.method ?? 'GET').toUpperCase();
      const endpoint = config.url ?? '/unknown';

      const queuedRequest: QueuedRequest = {
        id: this.generateId(),
        config,
        timestamp: Date.now(),
        retries: 0,
        maxRetries: this.MAX_RETRIES,
        priority,
        endpoint,
        method,
      };

      queue.push(queuedRequest);
      this.sortByPriority(queue);
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

      this.metrics.totalQueued++;
      this.metrics.byPriority[priority]++;
      this.metrics.byMethod[method] = (this.metrics.byMethod[method] ?? 0) + 1;
      await this.persistMetrics();

      logger.info(
        `Added request to queue: [${priority}] ${method} ${endpoint}`,
      );
      this.notifyListeners(queue.length);

      mobileAnalyticsService.trackEvent('request_queued' as any, {
        priority,
        method,
        endpoint,
        queueSize: queue.length,
      });

      return queuedRequest.id;
    } catch (error) {
      logger.error('Error adding request to queue:', error);
      return '';
    }
  }

  async getQueue(): Promise<QueuedRequest[]> {
    try {
      const data = await AsyncStorage.getItem(QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      logger.error('Error getting request queue:', error);
      return [];
    }
  }

  async removeFromQueue(id: string): Promise<void> {
    try {
      const queue = await this.getQueue();
      const removed = queue.find((req) => req.id === id);
      const filtered = queue.filter((req) => req.id !== id);

      if (removed) {
        this.metrics.totalQueued = Math.max(0, this.metrics.totalQueued - 1);
        this.metrics.byPriority[removed.priority] = Math.max(
          0,
          this.metrics.byPriority[removed.priority] - 1,
        );
        this.metrics.byMethod[removed.method] = Math.max(
          0,
          (this.metrics.byMethod[removed.method] ?? 1) - 1,
        );
      }

      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
      this.notifyListeners(filtered.length);
    } catch (error) {
      logger.error('Error removing from queue:', error);
    }
  }

  async incrementRetry(id: string): Promise<void> {
    try {
      const queue = await this.getQueue();
      const request = queue.find((req) => req.id === id);
      if (request) {
        request.retries += 1;
        this.metrics.totalRetries++;
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        await this.persistMetrics();
      }
    } catch (error) {
      logger.error('Error incrementing retry:', error);
    }
  }

  async processQueue(apiClient?: any): Promise<void> {
    if (this.isProcessing) return;

    if (apiClient) {
      this.apiClient = apiClient;
    }

    const isConnected = await this.checkConnectivity();
    if (!isConnected) return;

    this.isProcessing = true;
    try {
      const queue = await this.getQueue();
      if (queue.length === 0) return;

      const validRequests = queue.filter(
        (req) => req.retries < req.maxRetries,
      );
      const expiredRequests = queue.filter(
        (req) => req.retries >= req.maxRetries,
      );

      for (const expired of expiredRequests) {
        await this.removeFromQueue(expired.id);
        logger.warn(
          `Request ${expired.id} [${expired.priority}] ${expired.method} ${expired.endpoint} dropped after ${expired.maxRetries} retries`,
        );
      }

      const batches = this.createBatches(validRequests);
      this.metrics.batchesFormed += batches.length;

      for (const batch of batches) {
        await this.processBatch(batch);
      }

      this.metrics.lastSyncTimestamp = Date.now();
      await this.persistMetrics();
    } catch (error) {
      logger.error('Error processing queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  resume(): void {
    logger.info('RequestQueue: Resuming queue from persisted storage');
    this.restoreMetrics();
    const pending = this.getQueue();
    pending
      .then((q) => {
        this.notifyListeners(q.length);
        if (q.length > 0) {
          logger.info(
            `RequestQueue: ${q.length} pending requests restored from storage`,
          );
          mobileAnalyticsService.trackEvent('queue_resumed' as any, {
            pendingCount: q.length,
          });
        }
      })
      .catch(() => {});
  }

  startMonitoring(apiClient?: any): void {
    if (apiClient) {
      this.apiClient = apiClient;
    }

    if (!this.apiClient) {
      logger.warn('RequestQueue: Cannot start monitoring without an apiClient');
      return;
    }

    if (this.monitoringInterval) {
      logger.warn('RequestQueue: Monitoring is already running');
      return;
    }

    this.resume();

    this.monitoringInterval = setInterval(async () => {
      await this.processQueue(this.apiClient!);
    }, MONITOR_INTERVAL_MS);

    void this.processQueue(this.apiClient);
    this.listenForNetworkChanges();
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info('RequestQueue: Monitoring stopped');
    }

    if (this.networkListener) {
      this.networkListener();
      this.networkListener = null;
    }
  }

  async getPendingCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }

  async getPendingByPriority(): Promise<Record<RequestPriority, number>> {
    const queue = await this.getQueue();
    const counts: Record<RequestPriority, number> = {
      critical: 0,
      high: 0,
      normal: 0,
      low: 0,
    };
    for (const req of queue) {
      counts[req.priority]++;
    }
    return counts;
  }

  async getQueueStatus(): Promise<{
    total: number;
    byPriority: Record<RequestPriority, number>;
    byMethod: Record<string, number>;
    totalRetries: number;
    batchesFormed: number;
    lastSyncTimestamp: number | null;
    isProcessing: boolean;
    isMonitoring: boolean;
  }> {
    const queue = await this.getQueue();
    const byPriority = await this.getPendingByPriority();
    return {
      total: queue.length,
      byPriority,
      byMethod: { ...this.metrics.byMethod },
      totalRetries: this.metrics.totalRetries,
      batchesFormed: this.metrics.batchesFormed,
      lastSyncTimestamp: this.metrics.lastSyncTimestamp,
      isProcessing: this.isProcessing,
      isMonitoring: this.monitoringInterval !== null,
    };
  }

  onPendingCountChange(listener: (count: number) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private createBatches(requests: QueuedRequest[]): BatchGroup[] {
    const groups = new Map<string, QueuedRequest[]>();

    for (const req of requests) {
      const key = `${req.method}:${req.endpoint}`;
      const existing = groups.get(key) ?? [];
      existing.push(req);
      groups.set(key, existing);
    }

    return Array.from(groups.entries()).map(([key, group]) => {
      const [method, endpoint] = key.split(':');
      return { method, endpoint, requests: group };
    });
  }

  private async processBatch(batch: BatchGroup): Promise<void> {
    const { method, endpoint, requests } = batch;
    const client = this.apiClient;

    if (!client) {
      logger.warn('RequestQueue: No apiClient available for batch processing');
      return;
    }

    if (requests.length === 1) {
      const req = requests[0];
      try {
        await client(req.config);
        await this.removeFromQueue(req.id);
        mobileAnalyticsService.trackEvent('request_dequeued' as any, {
          priority: req.priority,
          method: req.method,
          endpoint: req.endpoint,
          batched: false,
        });
      } catch (error) {
        await this.incrementRetry(req.id);
      }
      return;
    }

    logger.info(
      `RequestQueue: Batching ${requests.length} ${method} requests to ${endpoint}`,
    );

    if (method === 'GET') {
      const results = await Promise.allSettled(
        requests.map((req) => client(req.config).catch(() => {})),
      );
      for (let i = 0; i < requests.length; i++) {
        if (results[i].status === 'fulfilled') {
          await this.removeFromQueue(requests[i].id);
        } else {
          await this.incrementRetry(requests[i].id);
        }
      }
      return;
    }

    if (method === 'PUT' || method === 'PATCH') {
      const payloads = requests.map((req) => req.config.data);
      try {
        const mergedPayload = this.mergePayloads(payloads);
        const batchConfig = {
          ...requests[0].config,
          data: mergedPayload,
          url: endpoint,
          method: method.toLowerCase(),
        };
        await client(batchConfig);
        for (const req of requests) {
          await this.removeFromQueue(req.id);
        }
        mobileAnalyticsService.trackEvent('queue_batch_synced' as any, {
          method,
          endpoint,
          batchSize: requests.length,
        });
        return;
      } catch (error) {
        for (const req of requests) {
          await this.incrementRetry(req.id);
        }
        return;
      }
    }

    for (const req of requests) {
      try {
        await client(req.config);
        await this.removeFromQueue(req.id);
      } catch (error) {
        await this.incrementRetry(req.id);
      }
    }
  }

  private mergePayloads(payloads: any[]): any {
    if (payloads.length === 0) return {};
    if (payloads.length === 1) return payloads[0];

    const merged: Record<string, any> = {};
    for (const payload of payloads) {
      if (payload && typeof payload === 'object') {
        Object.assign(merged, payload);
      }
    }
    return merged;
  }

  private sortByPriority(queue: QueuedRequest[]): void {
    queue.sort((a, b) => {
      const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp - b.timestamp;
    });
  }

  private notifyListeners(count: number): void {
    this.listeners.forEach((listener) => listener(count));
  }

  private async checkConnectivity(): Promise<boolean> {
    try {
      const state = await Network.getNetworkStateAsync();
      return (state.isConnected && state.isInternetReachable) ?? false;
    } catch {
      return false;
    }
  }

  private async listenForNetworkChanges(): Promise<void> {
    try {
      const listener = Network.addNetworkStateListener((state) => {
        const online =
          (state.isConnected && state.isInternetReachable) ?? false;
        if (online) {
          logger.info('RequestQueue: Network became available, processing queue');
          void this.processQueue(this.apiClient!);
        }
      });
      this.networkListener = () => listener.remove();
    } catch (error) {
      logger.error(
        'RequestQueue: Failed to listen for network changes:',
        error,
      );
    }
  }

  private async persistMetrics(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        QUEUE_METRICS_KEY,
        JSON.stringify(this.metrics),
      );
    } catch (error) {
      logger.error('Error persisting queue metrics:', error);
    }
  }

  private async restoreMetrics(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(QUEUE_METRICS_KEY);
      if (data) {
        const restored = JSON.parse(data) as Partial<QueueMetrics>;
        this.metrics = {
          ...this.metrics,
          ...restored,
        };
      }
    } catch (error) {
      logger.error('Error restoring queue metrics:', error);
    }
  }

  private generateId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const requestQueue = new RequestQueue();
export default requestQueue;
