import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';

import { appLogger } from '../../utils/logger';
import { AnalyticsEvent, EventProperties } from '../../utils/trackingEvents';
import apiClient from '../api/axios.config';

const MAX_BATCH_SIZE = 20;
const FLUSH_INTERVAL_MS = 30000;
const MAX_RETRIES = 5;
const STORAGE_KEY = '@analytics/pending';

export interface AnalyticsEventEntry {
  event: AnalyticsEvent;
  properties?: Record<string, unknown>;
  timestamp: string;
}

interface StoredBatch {
  events: AnalyticsEventEntry[];
  retryCount: number;
}

export class AnalyticsBatchQueue {
  private buffer: AnalyticsEventEntry[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private isFlushing = false;
  private currentFlushPromise: Promise<void> | null = null;

  enqueue(event: AnalyticsEvent, properties?: EventProperties): void {
    this.buffer.push({
      event,
      properties: properties as Record<string, unknown> | undefined,
      timestamp: new Date().toISOString(),
    });

    if (this.buffer.length >= MAX_BATCH_SIZE) {
      this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), FLUSH_INTERVAL_MS);
    }
  }

  async flush(): Promise<void> {
    if (this.isFlushing) {
      return this.currentFlushPromise ?? Promise.resolve();
    }
    this.isFlushing = true;
    this.currentFlushPromise = this.executeFlush();
    try {
      await this.currentFlushPromise;
    } finally {
      this.isFlushing = false;
      this.currentFlushPromise = null;
    }
  }

  private async executeFlush(): Promise<void> {
    this.clearTimer();

    const currentBatch = this.buffer.splice(0);
    const stored = await this.getStoredBatch();
    const baseRetryCount = stored?.retryCount ?? 0;
    const allEvents = stored ? [...stored.events, ...currentBatch] : currentBatch;

    if (allEvents.length === 0) return;

    try {
      await apiClient.post('/analytics/events', { events: allEvents });
      await this.clearStoredBatch();
      appLogger.info(`AnalyticsBatchQueue: Flushed ${allEvents.length} events`);
    } catch {
      const newRetryCount = baseRetryCount + 1;
      if (newRetryCount > MAX_RETRIES) {
        await this.clearStoredBatch();
        Sentry.captureMessage(
          `Analytics batch dropped after ${MAX_RETRIES} failed attempts`,
          'warning'
        );
        appLogger.warn(`AnalyticsBatchQueue: Batch dropped after ${MAX_RETRIES} failed attempts`);
      } else {
        await this.storeBatch(allEvents, newRetryCount);
        const delay = Math.min(Math.pow(2, newRetryCount - 1) * 1000, 30000);
        this.timer = setTimeout(() => this.flush(), delay);
        appLogger.warn(
          `AnalyticsBatchQueue: Flush failed, retry ${newRetryCount}/${MAX_RETRIES} in ${delay}ms`
        );
      }
    }
  }

  get size(): number {
    return this.buffer.length;
  }

  destroy(): void {
    this.clearTimer();
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private async getStoredBatch(): Promise<StoredBatch | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private async storeBatch(events: AnalyticsEventEntry[], retryCount: number): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ events, retryCount }));
    } catch {
      /* silent */
    }
  }

  private async clearStoredBatch(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      /* silent */
    }
  }
}
