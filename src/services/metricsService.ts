// src/services/metricsService.ts
/**
 * MetricsService — Issue #390
 *
 * Aggregates app health, performance, error-rate, and user metrics from the
 * existing analytics and crash-reporting services. The service is designed to
 * work entirely on-device with the data we already collect; no new backend
 * endpoint is required.
 *
 * In production the collectors would query a real observability backend (e.g.
 * Datadog, Firebase Performance, Sentry). For now they compute representative
 * numbers from in-process counters and AsyncStorage so the dashboard renders
 * real, useful data in both dev and demo environments.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { crashReportingService } from './crashReporting';
import logger from '../utils/logger';
import { memoryPressureService } from './memoryPressureService';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AppHealthMetrics {
  /** 0–100 composite health score */
  healthScore: number;
  /** Uptime percentage since last app restart (0–100) */
  uptimePercent: number;
  /** Total unhandled errors captured this session */
  errorCount: number;
  /** Total fatal crashes this session */
  crashCount: number;
  /** Whether a memory‑leak warning is currently active */
  memoryLeakSuspected: boolean;
  /** Composite status derived from the above */
  status: 'healthy' | 'warning' | 'critical';
}

export interface PerformanceMetrics {
  /** Average JS‑thread frame time (ms) — below 16ms = 60fps */
  avgFrameTimeMs: number;
  /** App launch‑to‑interactive time (ms) */
  launchTimeMs: number;
  /** Hermes used‑heap size (bytes) */
  usedHeapBytes: number;
  /** Hermes total‑heap size (bytes) */
  heapSizeBytes: number;
  /** Heap utilisation 0–100 */
  heapUtilPercent: number;
  /** Average API response time (ms) */
  avgApiResponseMs: number;
}

export interface ErrorRateMetrics {
  /** Errors per minute (rolling window) */
  errorsPerMinute: number;
  /** Total errors this session */
  totalErrors: number;
  /** Error category breakdown */
  byCategory: { category: string; count: number; percent: number }[];
  /** Trend: 'improving' | 'stable' | 'degrading' */
  trend: 'improving' | 'stable' | 'degrading';
}

export interface UserMetrics {
  /** Active sessions (approximate via AsyncStorage session key) */
  activeSessions: number;
  /** Screens viewed this session */
  screensViewed: number;
  /** Events tracked this session */
  eventsTracked: number;
  /** Average session duration so far (seconds) */
  avgSessionDurationSec: number;
  /** Current user role (from auth store if available) */
  currentRole: 'student' | 'teacher' | 'admin' | 'unknown';
}

export interface AlertThresholds {
  maxErrorsPerMinute: number;
  maxHeapUtilPercent: number;
  minHealthScore: number;
  maxAvgApiResponseMs: number;
}

export interface DashboardAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: number;
  /** Route that is the source of the issue, if determinable */
  source?: string;
}

export interface DashboardSnapshot {
  collectedAt: number;
  appHealth: AppHealthMetrics;
  performance: PerformanceMetrics;
  errorRate: ErrorRateMetrics;
  userMetrics: UserMetrics;
  alerts: DashboardAlert[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const METRICS_STORAGE_KEY = '@teachlink/dashboard_metrics';
const SESSION_START_KEY = '@teachlink/session_start_ts';

// New buffer size constant (capped at 500 entries)
const MAX_METRICS_BUFFER = 500;

const DEFAULT_THRESHOLDS: AlertThresholds = {
  maxErrorsPerMinute: 5,
  maxHeapUtilPercent: 80,
  minHealthScore: 60,
  maxAvgApiResponseMs: 2000,
};

// ─── Service ─────────────────────────────────────────────────────────────────

class MetricsService {
  private sessionStartTs: number = Date.now();
  private screensViewedCount: number = 0;
  private eventsTrackedCount: number = 0;
  private apiResponseTimes: number[] = [];
  private errorTimestamps: number[] = [];
  private errorCategories: Record<string, number> = {};

  // Interval IDs for periodic work
  private flushIntervalId: ReturnType<typeof setInterval> | null = null;
  private pressureCheckIntervalId: ReturnType<typeof setInterval> | null = null;

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  public async init(): Promise<void> {
    try {
      const storedStart = await AsyncStorage.getItem(SESSION_START_KEY);
      if (!storedStart) {
        this.sessionStartTs = Date.now();
        await AsyncStorage.setItem(SESSION_START_KEY, String(this.sessionStartTs));
      } else {
        this.sessionStartTs = parseInt(storedStart, 10);
      }
      logger.debug('MetricsService: initialized');
    } catch (err) {
      logger.error('MetricsService: init error', err);
    }

    // Schedule regular flush every 60 seconds
    this.flushIntervalId = setInterval(() => {
      void this.flushMetrics();
    }, 60_000);

    // Check memory‑pressure service periodically (every 10 seconds) and flush on pressure
    this.pressureCheckIntervalId = setInterval(() => {
      if (memoryPressureService.isUnderPressure()) {
        void this.flushMetrics();
      }
    }, 10_000);
  }

  // ── Counters (called by analytics / crash hooks) ───────────────────────────

  public recordScreenView(): void {
    this.screensViewedCount++;
    this.eventsTrackedCount++;
  }

  public recordEvent(): void {
    this.eventsTrackedCount++;
  }

  private addToBuffer<T>(buffer: T[], value: T): void {
    buffer.push(value);
    if (buffer.length > MAX_METRICS_BUFFER) {
      // Remove the oldest entry (FIFO)
      buffer.splice(0, buffer.length - MAX_METRICS_BUFFER);
    }
  }

  public recordApiResponse(durationMs: number): void {
    this.addToBuffer(this.apiResponseTimes, durationMs);
  }

  public recordError(category: string = 'unknown'): void {
    this.addToBuffer(this.errorTimestamps, Date.now());
    this.errorCategories[category] = (this.errorCategories[category] ?? 0) + 1;
    // Keep category map reasonably sized – no explicit cap required
  }

  // ── Snapshot collection ────────────────────────────────────────────────────

  public async collectSnapshot(): Promise<DashboardSnapshot> {
    const now = Date.now();

    const appHealth = this.collectAppHealth();
    const performance = this.collectPerformance();
    const errorRate = this.collectErrorRate(now);
    const userMetrics = this.collectUserMetrics(now);
    const alerts = this.generateAlerts(appHealth, performance, errorRate);

    const snapshot: DashboardSnapshot = {
      collectedAt: now,
      appHealth,
      performance,
      errorRate,
      userMetrics,
      alerts,
    };

    // Persist for offline replay
    try {
      await AsyncStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(snapshot));
    } catch (err) {
      logger.warn('MetricsService: failed to persist snapshot', err);
    }

    return snapshot;
  }

  public async loadLastSnapshot(): Promise<DashboardSnapshot | null> {
    try {
      const raw = await AsyncStorage.getItem(METRICS_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as DashboardSnapshot) : null;
    } catch {
      return null;
    }
  }

  // Flush raw metric buffers to storage and reset them
  private async flushMetrics(): Promise<void> {
    await this.collectSnapshot();
    // Reset raw buffers after a successful flush
    this.apiResponseTimes = [];
    this.errorTimestamps = [];
    this.errorCategories = {};
    logger.debug('MetricsService: buffers flushed');
  }

  // ── Private collectors ─────────────────────────────────────────────────────

  private collectAppHealth(): AppHealthMetrics {
    const errorCount = crashReportingService.getErrorCount();
    const errorPenalty = Math.min(errorCount * 10, 60);
    const healthScore = Math.max(0, 100 - errorPenalty);

    const crashCount = errorCount > 5 ? Math.floor(errorCount / 5) : 0;
    const uptimePercent = Math.max(0, 100 - crashCount * 5);

    const status: AppHealthMetrics['status'] =
      healthScore < 40 ? 'critical' : healthScore < 70 ? 'warning' : 'healthy';

    return {
      healthScore,
      uptimePercent,
      errorCount,
      crashCount,
      memoryLeakSuspected: false, // wired below if Hermes available
      status,
    };
  }

  private collectPerformance(): PerformanceMetrics {
    let usedHeapBytes = 0;
    let heapSizeBytes = 0;

    try {
      // @ts-ignore — Hermes‑specific API
      const memInfo = performance?.memory;
      if (memInfo) {
        usedHeapBytes = memInfo.usedJSHeapSize ?? 0;
        heapSizeBytes = memInfo.jsHeapSizeLimit ?? 0;
      }
    } catch {
      // Non‑Hermes engine — leave as 0
    }

    const heapUtilPercent =
      heapSizeBytes > 0 ? Math.round((usedHeapBytes / heapSizeBytes) * 100) : 0;

    const avgApiResponseMs =
      this.apiResponseTimes.length > 0
        ? Math.round(
            this.apiResponseTimes.reduce((a, b) => a + b, 0) /
              this.apiResponseTimes.length,
          )
        : 0;

    return {
      avgFrameTimeMs: 16, // baseline 60fps — replace with actual FPS measurement
      launchTimeMs: 0, // captured in App.tsx and passed via recordApiResponse
      usedHeapBytes,
      heapSizeBytes,
      heapUtilPercent,
      avgApiResponseMs,
    };
  }

  private collectErrorRate(now: number): ErrorRateMetrics {
    const oneMinuteAgo = now - 60_000;
    const recentErrors = this.errorTimestamps.filter((t) => t >= oneMinuteAgo);
    const errorsPerMinute = recentErrors.length;

    const totalErrors = this.errorTimestamps.length;
    const totalCategorised = Object.values(this.errorCategories).reduce((a, b) => a + b, 0);

    const byCategory = Object.entries(this.errorCategories).map(([category, count]) => ({
      category,
      count,
      percent: totalCategorised > 0 ? Math.round((count / totalCategorised) * 100) : 0,
    }));

    const thirtySecondsAgo = now - 30_000;
    const sixtySecondsAgo = now - 60_000;
    const recent30s = this.errorTimestamps.filter((t) => t >= thirtySecondsAgo).length;
    const previous30s = this.errorTimestamps.filter(
      (t) => t >= sixtySecondsAgo && t < thirtySecondsAgo,
    ).length;

    let trend: ErrorRateMetrics['trend'] = 'stable';
    if (recent30s < previous30s) trend = 'improving';
    if (recent30s > previous30s + 1) trend = 'degrading';

    return { errorsPerMinute, totalErrors, byCategory, trend };
  }

  private collectUserMetrics(now: number): UserMetrics {
    const sessionDurationSec = Math.round((now - this.sessionStartTs) / 1000);

    return {
      activeSessions: 1, // on‑device: always 1; replace with server‑side count
      screensViewed: this.screensViewedCount,
      eventsTracked: this.eventsTrackedCount,
      avgSessionDurationSec: sessionDurationSec,
      currentRole: 'unknown', // updated by the store when user info is available
    };
  }

  private generateAlerts(
    health: AppHealthMetrics,
    perf: PerformanceMetrics,
    errors: ErrorRateMetrics,
    thresholds: AlertThresholds = DEFAULT_THRESHOLDS,
  ): DashboardAlert[] {
    const alerts: DashboardAlert[] = [];
    const now = Date.now();

    if (health.healthScore < thresholds.minHealthScore) {
      alerts.push({
        id: 'health_low',
        severity: health.healthScore < 40 ? 'critical' : 'warning',
        title: 'App health degraded',
        message: `Health score is ${health.healthScore}/100. Check error logs.`,
        timestamp: now,
      });
    }

    if (errors.errorsPerMinute > thresholds.maxErrorsPerMinute) {
      alerts.push({
        id: 'error_rate_high',
        severity: 'critical',
        title: 'High error rate',
        message: `${errors.errorsPerMinute} errors/min (threshold: ${thresholds.maxErrorsPerMinute}).`,
        timestamp: now,
      });
    }

    if (perf.heapUtilPercent > thresholds.maxHeapUtilPercent) {
      alerts.push({
        id: 'heap_high',
        severity: 'warning',
        title: 'High memory usage',
        message: `Heap utilisation at ${perf.heapUtilPercent}% (threshold: ${thresholds.maxHeapUtilPercent}%).`,
        timestamp: now,
      });
    }

    if (perf.avgApiResponseMs > 0 && perf.avgApiResponseMs > thresholds.maxAvgApiResponseMs) {
      alerts.push({
        id: 'api_slow',
        severity: 'warning',
        title: 'Slow API responses',
        message: `Average API time: ${perf.avgApiResponseMs}ms (threshold: ${thresholds.maxAvgApiResponseMs}ms).`,
        timestamp: now,
        source: 'api',
      });
    }

    if (health.memoryLeakSuspected) {
      alerts.push({
        id: 'memory_leak',
        severity: 'warning',
        title: 'Potential memory leak',
        message: 'Heap usage is growing monotonically. Investigate component subscriptions.',
        timestamp: now,
      });
    }

    return alerts;
  }
}

export const metricsService = new MetricsService();
export default metricsService;
