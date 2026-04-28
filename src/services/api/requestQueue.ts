import AsyncStorage from '@react-native-async-storage/async-storage';
import { InternalAxiosRequestConfig } from 'axios';
import * as Network from 'expo-network';
import logger from '../../utils/logger';

// Queued request interface
export interface QueuedRequest {
  id: string;
  config: InternalAxiosRequestConfig;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

const QUEUE_KEY = '@teachlink_request_queue';

class RequestQueue {
  private readonly MAX_RETRIES = 3;
  private isProcessing = false;
  private listeners: ((count: number) => void)[] = [];

  /**
   * Add a failed request to the queue
   */
  async addToQueue(config: InternalAxiosRequestConfig): Promise<void> {
    try {
      const queue = await this.getQueue();
      const queuedRequest: QueuedRequest = {
        id: this.generateId(),
        config,
        timestamp: Date.now(),
        retries: 0,
        maxRetries: this.MAX_RETRIES,
      };
      queue.push(queuedRequest);
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      logger.info(`Added request to queue: ${config.method?.toUpperCase()} ${config.url}`);
      this.notifyListeners(queue.length);
    } catch (error) {
      logger.error('Error adding request to queue:', error);
    }
  }

  /**
   * Get the current queue
   */
  async getQueue(): Promise<QueuedRequest[]> {
    try {
      const data = await AsyncStorage.getItem(QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      logger.error('Error getting request queue:', error);
      return [];
    }
  }

  /**
   * Remove a request from the queue
   */
  async removeFromQueue(id: string): Promise<void> {
    try {
      const queue = await this.getQueue();
      const filtered = queue.filter(req => req.id !== id);
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
      this.notifyListeners(filtered.length);
    } catch (error) {
      logger.error('Error removing from queue:', error);
    }
  }

  /**
   * Increment retry count
   */
  async incrementRetry(id: string): Promise<void> {
    try {
      const queue = await this.getQueue();
      const request = queue.find(req => req.id === id);
      if (request) {
        request.retries += 1;
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      }
    } catch (error) {
      logger.error('Error incrementing retry:', error);
    }
  }

  /**
   * Process the queue when online
   */
  async processQueue(apiClient: any): Promise<void> {
    if (this.isProcessing) return;

    const isConnected = await this.checkConnectivity();
    if (!isConnected) return;

    this.isProcessing = true;
    try {
      const queue = await this.getQueue();
      for (const request of queue) {
        if (request.retries >= request.maxRetries) {
          // Remove failed requests
          await this.removeFromQueue(request.id);
          continue;
        }

        try {
          await apiClient(request.config);
          await this.removeFromQueue(request.id);
        } catch (error) {
          await this.incrementRetry(request.id);
        }
      }
    } catch (error) {
      logger.error('Error processing queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Start monitoring network and processing queue
   */
  startMonitoring(apiClient: any): void {
    const interval = setInterval(async () => {
      await this.processQueue(apiClient);
    }, 10000); // Check every 10 seconds

    // Also process immediately if online
    this.processQueue(apiClient);
  }

  /**
   * Get pending requests count
   */
  async getPendingCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }

  /**
   * Subscribe to pending count changes
   */
  onPendingCountChange(listener: (count: number) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(count: number): void {
    this.listeners.forEach(listener => listener(count));
  }

  private async checkConnectivity(): Promise<boolean> {
    try {
      const state = await Network.getNetworkStateAsync();
      return state.isConnected && state.isInternetReachable;
    } catch {
      return false;
    }
  }

  private generateId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const requestQueue = new RequestQueue();
export default requestQueue;