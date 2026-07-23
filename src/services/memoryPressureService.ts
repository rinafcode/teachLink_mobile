import { DeviceEventEmitter } from 'react-native';

import { requestQueue } from './api/requestQueue';
import { FeatureType } from './featureCapabilities';
import { metricsService } from './metricsService';
import { preloadService } from './preloadService';
import { searchIndexService } from './searchIndex';
import { syncService } from './syncService';
import { useDegradationStore } from '../store/degradationStore';
import { useDeviceStore, type MemoryPressureLevel } from '../store/deviceStore';
import { ImageCache } from '../utils/imageCache';
import { appLogger } from '../utils/logger';
import {
  captureMemorySnapshot,
  MEMORY_PRESSURE_THRESHOLD,
  type MemorySnapshot,
} from '../utils/memoryProfiler';

// ─── Thresholds ──────────────────────────────────────────────────────────────

/** Heap utilisation above 70% triggers warning-level cleanup. */
const WARNING_THRESHOLD = MEMORY_PRESSURE_THRESHOLD; // 0.7
/** Heap utilisation above 85% triggers critical-level degradation. */
const CRITICAL_THRESHOLD = 0.85;
/** Polling interval in ms. */
const MEMORY_PRESSURE_CHECK_INTERVAL_MS = 10_000;

/**
 * Features to disable when memory pressure reaches critical level.
 * CAMERA is the primary high-memory feature; image capture & processing
 * can easily push a low-end device over the OOM threshold.
 */
const HIGH_MEMORY_FEATURES: FeatureType[] = [FeatureType.CAMERA];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function determinePressureLevel(utilization: number): MemoryPressureLevel {
  if (utilization > CRITICAL_THRESHOLD) return 'critical';
  if (utilization > WARNING_THRESHOLD) return 'warning';
  return 'normal';
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class MemoryPressureService {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isInitialized = false;
  private currentLevel: MemoryPressureLevel = 'normal';
  /** Features disabled during critical pressure — tracked to restore them. */
  private degradedFeatures = new Set<FeatureType>();
  /** Subscription returned by DeviceEventEmitter.addListener. */
  private nativeEventListener: { remove: () => void } | null = null;

  // ── Lifecycle ────────────────────────────────────────────────────────────

  public init(): void {
    if (this.isInitialized) {
      return;
    }

    this.isInitialized = true;
    void this.checkMemoryPressure();

    this.intervalId = setInterval(() => {
      void this.checkMemoryPressure();
    }, MEMORY_PRESSURE_CHECK_INTERVAL_MS);

    this.subscribeNativeEvents();
  }

  public shutdown(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.unsubscribeNativeEvents();
    this.restoreDegradedFeatures();
    this.isInitialized = false;
  }

  // ── Public query ─────────────────────────────────────────────────────────

  public isUnderPressure(): boolean {
    return this.currentLevel !== 'normal';
  }

  public getPressureLevel(): MemoryPressureLevel {
    return this.currentLevel;
  }

  // ── Core check logic ─────────────────────────────────────────────────────

  public async checkMemoryPressure(): Promise<MemoryPressureLevel> {
    const snapshot = captureMemorySnapshot();
    const utilization = snapshot.heapSizeBytes
      ? snapshot.usedHeapBytes / snapshot.heapSizeBytes
      : 0;
    const newLevel = determinePressureLevel(utilization);

    if (newLevel !== this.currentLevel) {
      const previousLevel = this.currentLevel;
      this.currentLevel = newLevel;

      // Dispatch to deviceStore so the rest of the app can react.
      useDeviceStore.getState().setMemoryPressureLevel(newLevel);

      if (newLevel === 'normal') {
        this.handleRecovery(snapshot, utilization, previousLevel);
      } else {
        await this.handlePressure(snapshot, utilization, newLevel, previousLevel);
      }
    }

    return newLevel;
  }

  // ── Pressure handling ────────────────────────────────────────────────────

  private async handlePressure(
    snapshot: MemorySnapshot,
    utilization: number,
    level: MemoryPressureLevel,
    previousLevel: MemoryPressureLevel
  ): Promise<void> {
    const pct = (utilization * 100).toFixed(0);
    const logFn = level === 'critical' ? appLogger.warnSync : appLogger.warnSync;

    logFn(`Memory pressure: ${level}`, {
      usedHeapBytes: snapshot.usedHeapBytes,
      heapSizeBytes: snapshot.heapSizeBytes,
      utilization: `${pct}%`,
      previousLevel,
    });

    // ── Warning-level cleanup (also runs on critical) ──────────────────
    await Promise.allSettled([
      // Clear non-critical image cache entries.
      ImageCache.clearNonCritical(),
      // Flush metric buffers so data is not lost on OOM kill.
      metricsService.flush(),
      // Pause background preloading.
      preloadService.pausePrefetch(),
      // Stop network request monitoring.
      requestQueue.stopMonitoring(),
      // Stop auto-sync and remove event listeners.
      syncService.stopAutoSync(),
      syncService.removeAllEventListeners(),
    ]);

    // Compact search index synchronously (inexpensive, no I/O).
    searchIndexService.compact();

    // ── Critical-level: disable high-memory features ───────────────────
    if (level === 'critical') {
      this.degradeHighMemoryFeatures();
    }
  }

  private handleRecovery(
    snapshot: MemorySnapshot,
    utilization: number,
    previousLevel: MemoryPressureLevel
  ): void {
    appLogger.infoSync('Memory pressure recovered', {
      usedHeapBytes: snapshot.usedHeapBytes,
      heapSizeBytes: snapshot.heapSizeBytes,
      utilization: `${(utilization * 100).toFixed(0)}%`,
      previousLevel,
    });

    // Resume paused services.
    preloadService.resumePrefetch();
    requestQueue.startMonitoring();
    syncService.startAutoSync();

    // Restore features degraded during critical pressure.
    this.restoreDegradedFeatures();
  }

  // ── Feature degradation ─────────────────────────────────────────────────

  private degradeHighMemoryFeatures(): void {
    const degradationStore = useDegradationStore.getState();
    for (const feature of HIGH_MEMORY_FEATURES) {
      if (!this.degradedFeatures.has(feature)) {
        degradationStore.disableFeature(
          feature,
          'Critical memory pressure — feature disabled to prevent OOM kill'
        );
        this.degradedFeatures.add(feature);
        appLogger.warnSync(`[MemoryPressure] Disabled feature: ${feature}`);
      }
    }
  }

  private restoreDegradedFeatures(): void {
    if (this.degradedFeatures.size === 0) return;

    const degradationStore = useDegradationStore.getState();
    for (const feature of this.degradedFeatures) {
      degradationStore.enableFeature(feature);
      appLogger.infoSync(`[MemoryPressure] Restored feature: ${feature}`);
    }
    this.degradedFeatures.clear();
  }

  // ── Native event subscription ───────────────────────────────────────────

  /**
   * Subscribe to native OS memory warning events.
   *
   * React Native does not expose `didReceiveMemoryWarning` / `onTrimMemory`
   * out of the box, but a custom NativeModule can emit `'memoryWarning'`
   * through the DeviceEventEmitter. When that module is present this listener
   * responds to those events as an immediate signal (complementing the
   * periodic poll).
   */
  private subscribeNativeEvents(): void {
    if (this.nativeEventListener) return;

    try {
      this.nativeEventListener = DeviceEventEmitter.addListener(
        'memoryWarning',
        (event?: { level?: string }) => {
          // Map native-level severity to our internal levels.
          // Android onTrimMemory levels >= TRIM_MEMORY_RUNNING_CRITICAL (15)
          // map to 'critical'; TRIM_MEMORY_RUNNING_MODERATE (5) → 'warning'.
          const nativeSeverity = event?.level;
          if (nativeSeverity === 'critical') {
            this.currentLevel = 'critical';
          } else {
            // Treat any native warning as at least warning level.
            this.currentLevel = this.currentLevel === 'critical' ? 'critical' : 'warning';
          }

          void this.checkMemoryPressure();
        }
      );
    } catch {
      // Native module not available — polling alone is sufficient.
      appLogger.debugSync(
        '[MemoryPressure] Native memoryWarning listener unavailable; using polling only'
      );
    }
  }

  private unsubscribeNativeEvents(): void {
    if (this.nativeEventListener) {
      this.nativeEventListener.remove();
      this.nativeEventListener = null;
    }
  }
}

export const memoryPressureService = new MemoryPressureService();
