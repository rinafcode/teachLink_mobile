import { ImageCache } from '../utils/imageCache';
import { appLogger } from '../utils/logger';
import {
    captureMemorySnapshot,
    detectMemoryPressure,
    MEMORY_PRESSURE_THRESHOLD,
    type MemorySnapshot
} from '../utils/memoryProfiler';
import { requestQueue } from './api/requestQueue';
import { preloadService } from './preloadService';
import { syncService } from './syncService';

const MEMORY_PRESSURE_CHECK_INTERVAL_MS = 10_000;

export class MemoryPressureService {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isInitialized = false;
  private isPressureActive = false;

  public init(): void {
    if (this.isInitialized) {
      return;
    }

    this.isInitialized = true;
    void this.checkMemoryPressure();

    this.intervalId = setInterval(() => {
      void this.checkMemoryPressure();
    }, MEMORY_PRESSURE_CHECK_INTERVAL_MS);
  }

  public shutdown(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isInitialized = false;
  }

  public isUnderPressure(): boolean {
    return this.isPressureActive;
  }

  public async checkMemoryPressure(): Promise<boolean> {
    const snapshot = captureMemorySnapshot();
    const isHighPressure = detectMemoryPressure(snapshot);
    const utilization = snapshot.heapSizeBytes
      ? snapshot.usedHeapBytes / snapshot.heapSizeBytes
      : 0;

    if (isHighPressure && !this.isPressureActive) {
      this.isPressureActive = true;
      await this.handleHighMemoryPressure(snapshot, utilization);
    } else if (!isHighPressure && this.isPressureActive) {
      this.isPressureActive = false;
      this.handleMemoryPressureRecovery(snapshot, utilization);
    }

    return isHighPressure;
  }

  private async handleHighMemoryPressure(snapshot: MemorySnapshot, utilization: number) {
    appLogger.warnSync('High memory pressure detected', {
      usedHeapBytes: snapshot.usedHeapBytes,
      heapSizeBytes: snapshot.heapSizeBytes,
      utilization: `${(utilization * 100).toFixed(0)}%`, 
      threshold: `${MEMORY_PRESSURE_THRESHOLD * 100}%`,
    });

    await Promise.allSettled([
      ImageCache.clearCache(),
      (async () => {
        preloadService.pausePrefetch();
      })(),
      (async () => {
        requestQueue.stopMonitoring();
      })(),
      (async () => {
        syncService.stopAutoSync();
        syncService.removeAllEventListeners();
      })(),
    ]);
  }

  private handleMemoryPressureRecovery(snapshot: MemorySnapshot, utilization: number) {
    appLogger.infoSync('Memory pressure recovered', {
      usedHeapBytes: snapshot.usedHeapBytes,
      heapSizeBytes: snapshot.heapSizeBytes,
      utilization: `${(utilization * 100).toFixed(0)}%`, 
    });

    preloadService.resumePrefetch();
    requestQueue.startMonitoring();
    syncService.startAutoSync();
  }
}

export const memoryPressureService = new MemoryPressureService();
