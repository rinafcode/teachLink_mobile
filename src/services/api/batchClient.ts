import apiClient from './axios.config';
import logger from '../../utils/logger';

export interface BatchRequest {
  method: 'POST' | 'PUT' | 'DELETE';
  url: string;
  body?: any;
}

export interface BatchResponse {
  status: number;
  body: any;
}

export interface BatchMetrics {
  totalRequests: number;
  totalBatched: number;
  roundtripsReduced: number;
}

export interface BatchClientConfig {
  windowMs: number;
  maxBatchSize: number;
}

interface BatchEntry {
  request: BatchRequest;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}

class BatchClient {
  private readonly config: Required<BatchClientConfig>;
  private queue: BatchEntry[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private metrics: BatchMetrics = {
    totalRequests: 0,
    totalBatched: 0,
    roundtripsReduced: 0,
  };

  constructor(config?: Partial<BatchClientConfig>) {
    this.config = {
      windowMs: 50,
      maxBatchSize: 20,
      ...config,
    };
  }

  mutate(method: BatchRequest['method'], url: string, body?: any): Promise<any> {
    this.metrics.totalRequests++;

    return new Promise((resolve, reject) => {
      this.queue.push({ request: { method, url, body }, resolve, reject });

      if (this.queue.length >= this.config.maxBatchSize) {
        this.flush();
      } else {
        this.scheduleFlush();
      }
    });
  }

  async flush(): Promise<void> {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const entries = this.queue.splice(0);
    if (entries.length === 0) return;

    await this.dispatchBatch(entries);
  }

  getMetrics(): Readonly<BatchMetrics> {
    return { ...this.metrics };
  }

  // Exposed for test resets only
  _reset(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.queue = [];
    this.metrics = { totalRequests: 0, totalBatched: 0, roundtripsReduced: 0 };
  }

  private scheduleFlush(): void {
    if (this.timer !== null) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush();
    }, this.config.windowMs);
  }

  private async dispatchBatch(entries: BatchEntry[]): Promise<void> {
    this.metrics.totalBatched += entries.length;
    // N entries → 1 HTTP call = N-1 roundtrips saved
    this.metrics.roundtripsReduced += entries.length - 1;

    try {
      const response = await apiClient.post(
        '/api/batch',
        entries.map(e => e.request),
      );

      const responses: BatchResponse[] = response.data;

      if (!Array.isArray(responses)) {
        logger.warn('BatchClient: server returned non-array response, falling back');
        this.metrics.roundtripsReduced -= entries.length - 1;
        await this.fallbackToIndividual(entries);
        return;
      }

      entries.forEach((entry, i) => {
        const res = responses[i];
        if (res === undefined) {
          entry.reject(new Error('Batch response count mismatch'));
          return;
        }
        if (res.status >= 400) {
          entry.reject({ status: res.status, body: res.body });
        } else {
          entry.resolve(res.body);
        }
      });
    } catch (error) {
      logger.warn('BatchClient: batch endpoint failed, falling back to individual requests', error);
      // Undo the roundtrip credit since we're now sending N individual calls
      this.metrics.roundtripsReduced -= entries.length - 1;
      await this.fallbackToIndividual(entries);
    }
  }

  private async fallbackToIndividual(entries: BatchEntry[]): Promise<void> {
    const results = await Promise.allSettled(
      entries.map(entry => {
        const { method, url, body } = entry.request;
        if (method === 'POST') return apiClient.post(url, body);
        if (method === 'PUT') return apiClient.put(url, body);
        return apiClient.delete(url);
      }),
    );

    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        entries[i].resolve(result.value.data);
      } else {
        entries[i].reject(result.reason);
      }
    });
  }
}

export const batchClient = new BatchClient();
export default batchClient;
