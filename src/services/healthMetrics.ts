/**
 * HealthMetricsService — Real-time app health data collection
 *
 * Aggregates metrics from existing services (crashReporting, mobileAnalytics,
 * axios interceptors) into a unified snapshot used by the health dashboard.
 *
 * Metrics collected:
 *  - Crash rate  (crashes / sessions in the last window)
 *  - Error rate  (JS errors / minute)
 *  - API latency (p50 / p95 / p99 rolling window)
 *  - Active user sessions
 *  - Memory pressure (item-count proxy)
 *  - Network status
 */

import { appLogger } from '../utils/logger';
import { crashReportingService } from './crashReporting';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiLatencySample {
  endpoint: string;
  method: string;
  durationMs: number;
  statusCode: number;
  timestamp: number;
}

export interface HealthSnapshot {
  /** Unix ms when this snapshot was taken */
  capturedAt: number;

  // Crash & error
  crashCount: number;
  errorCount: number;
  /** Crashes per 100 sessions (0–100) */
  crashRate: number;
  /** JS errors per minute in the last window */
  errorRatePerMinute: number;

  // API latency (ms)
  apiLatencyP50: number;
  apiLatencyP95: number;
  apiLatencyP99: number;
  /** Number of API calls sampled in the current window */
  apiCallCount: number;
  /** Number of API errors in the current window */
  apiErrorCount: number;
  /** API error rate 0–100 */
  apiErrorRate: number;

  // Sessions
  activeSessions: number;
  totalSessionsInWindow: number;

  // Performance
  /** Frames per second estimate (0 = unknown) */
  fps: number;
  /** JS thread busy ratio 0–1 (0 = unknown) */
  jsBusyRatio: number;

  // Network
  isOnline: boolean;
  networkType: string;
}

export interface AlertThresholds {
  crashRateWarning: number;   // default 2
  crashRateCritical: number;  // default 5
  errorRateWarning: number;   // errors/min, default 10
  errorRateCritical: number;  // errors/min, default 30
  apiLatencyWarning: number;  // p95 ms, default 1000
  apiLatencyCritical: number; // p95 ms, default 3000
  apiErrorRateWarning: number;   // %, default 5
  apiErrorRateCritical: number;  // %, default 15
}

export type AlertSeverity = 'ok' | 'warning' | 'critical';

export interface MetricAlert {
  id: string;
  metric: string;
  severity: AlertSeverity;
  message: string;
  value: number;
  threshold: number;
  triggeredAt: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WINDOW_MS = 5 * 60 * 1000; // 5-minute rolling window
const MAX_LATENCY_SAMPLES = 500;
const MAX_ERROR_TIMESTAMPS = 200;

export const DEFAULT_THRESHOLDS: AlertThresholds = {
  crashRateWarning: 2,
  crashRateCritical: 5,
  errorRateWarning: 10,
  errorRateCritical: 30,
  apiLatencyWarning: 1000,
  apiLatencyCritical: 3000,
  apiErrorRateWarning: 5,
  apiErrorRateCritical: 15,
};

// ─── Service ──────────────────────────────────────────────────────────────────

class HealthMetricsService {
  private latencySamples: ApiLatencySample[] = [];
  private errorTimestamps: number[] = [];
  private sessionCount = 0;
  private isOnline = true;
  private networkType = 'unknown';
  private fpsEstimate = 60;
  private jsBusyRatio = 0;

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Record an API call result. Called from axios interceptors or API modules.
   */
  recordApiCall(sample: Omit<ApiLatencySample, 'timestamp'>): void {
    const entry: ApiLatencySample = { ...sample, timestamp: Date.now() };
    this.latencySamples.push(entry);

    // Keep buffer bounded
    if (this.latencySamples.length > MAX_LATENCY_SAMPLES) {
      this.latencySamples.shift();
    }
  }

  /**
   * Record a JS error occurrence (called from ErrorBoundary / global handler).
   */
  recordError(): void {
    this.errorTimestamps.push(Date.now());
    if (this.errorTimestamps.length > MAX_ERROR_TIMESTAMPS) {
      this.errorTimestamps.shift();
    }
  }

  /** Increment active session count. */
  incrementSessions(): void {
    this.sessionCount = Math.max(0, this.sessionCount + 1);
  }

  /** Decrement active session count. */
  decrementSessions(): void {
    this.sessionCount = Math.max(0, this.sessionCount - 1);
  }

  /** Update network status. */
  updateNetworkStatus(isOnline: boolean, type = 'unknown'): void {
    this.isOnline = isOnline;
    this.networkType = type;
  }

  /** Update FPS / JS busy ratio from a performance observer. */
  updatePerformanceMetrics(fps: number, jsBusyRatio: number): void {
    this.fpsEstimate = fps;
    this.jsBusyRatio = jsBusyRatio;
  }

  /**
   * Build a full health snapshot from current in-memory data.
   */
  getSnapshot(): HealthSnapshot {
    const now = Date.now();
    const windowStart = now - WINDOW_MS;

    // ── Latency ──────────────────────────────────────────────────────────────
    const windowSamples = this.latencySamples.filter(s => s.timestamp >= windowStart);
    const durations = windowSamples.map(s => s.durationMs).sort((a, b) => a - b);
    const apiCallCount = durations.length;
    const apiErrorCount = windowSamples.filter(s => s.statusCode >= 400).length;

    const p = (pct: number) => {
      if (durations.length === 0) return 0;
      const idx = Math.ceil((pct / 100) * durations.length) - 1;
      return durations[Math.max(0, idx)] ?? 0;
    };

    // ── Error rate ────────────────────────────────────────────────────────────
    const recentErrors = this.errorTimestamps.filter(t => t >= windowStart);
    const windowMinutes = WINDOW_MS / 60_000;
    const errorRatePerMinute = recentErrors.length / windowMinutes;

    // ── Crash rate ────────────────────────────────────────────────────────────
    const crashCount = crashReportingService.getErrorCount();
    const totalSessions = Math.max(1, this.sessionCount);
    const crashRate = Math.min(100, (crashCount / totalSessions) * 100);

    return {
      capturedAt: now,
      crashCount,
      errorCount: recentErrors.length,
      crashRate: parseFloat(crashRate.toFixed(2)),
      errorRatePerMinute: parseFloat(errorRatePerMinute.toFixed(2)),
      apiLatencyP50: p(50),
      apiLatencyP95: p(95),
      apiLatencyP99: p(99),
      apiCallCount,
      apiErrorCount,
      apiErrorRate:
        apiCallCount > 0
          ? parseFloat(((apiErrorCount / apiCallCount) * 100).toFixed(2))
          : 0,
      activeSessions: this.sessionCount,
      totalSessionsInWindow: totalSessions,
      fps: this.fpsEstimate,
      jsBusyRatio: this.jsBusyRatio,
      isOnline: this.isOnline,
      networkType: this.networkType,
    };
  }

  /**
   * Evaluate the current snapshot against thresholds and return active alerts.
   */
  evaluateAlerts(
    snapshot: HealthSnapshot,
    thresholds: AlertThresholds = DEFAULT_THRESHOLDS
  ): MetricAlert[] {
    const alerts: MetricAlert[] = [];
    const now = Date.now();

    const check = (
      id: string,
      metric: string,
      value: number,
      warning: number,
      critical: number,
      unit: string
    ) => {
      if (value >= critical) {
        alerts.push({
          id,
          metric,
          severity: 'critical',
          message: `${metric} is critically high: ${value}${unit} (threshold: ${critical}${unit})`,
          value,
          threshold: critical,
          triggeredAt: now,
        });
      } else if (value >= warning) {
        alerts.push({
          id,
          metric,
          severity: 'warning',
          message: `${metric} is elevated: ${value}${unit} (threshold: ${warning}${unit})`,
          value,
          threshold: warning,
          triggeredAt: now,
        });
      }
    };

    check('crash_rate', 'Crash Rate', snapshot.crashRate, thresholds.crashRateWarning, thresholds.crashRateCritical, '%');
    check('error_rate', 'Error Rate', snapshot.errorRatePerMinute, thresholds.errorRateWarning, thresholds.errorRateCritical, '/min');
    check('api_latency', 'API Latency (p95)', snapshot.apiLatencyP95, thresholds.apiLatencyWarning, thresholds.apiLatencyCritical, 'ms');
    check('api_error_rate', 'API Error Rate', snapshot.apiErrorRate, thresholds.apiErrorRateWarning, thresholds.apiErrorRateCritical, '%');

    if (!snapshot.isOnline) {
      alerts.push({
        id: 'offline',
        metric: 'Network',
        severity: 'critical',
        message: 'Device is offline — no network connectivity',
        value: 0,
        threshold: 1,
        triggeredAt: now,
      });
    }

    return alerts;
  }

  /**
   * Seed the service with synthetic data for development / demo purposes.
   * Only runs in __DEV__ mode.
   */
  seedDemoData(): void {
    if (!__DEV__) return;

    const now = Date.now();
    const endpoints = ['/api/courses', '/api/users', '/api/quiz', '/api/auth/refresh'];
    const methods = ['GET', 'POST', 'PUT'];

    // Generate 80 latency samples spread over the last 5 minutes
    for (let i = 0; i < 80; i++) {
      const age = Math.random() * WINDOW_MS;
      const latency = Math.random() < 0.9
        ? 100 + Math.random() * 600   // normal: 100–700ms
        : 1500 + Math.random() * 2000; // outlier: 1.5–3.5s
      const statusCode = Math.random() < 0.92 ? 200 : Math.random() < 0.5 ? 400 : 500;

      this.latencySamples.push({
        endpoint: endpoints[Math.floor(Math.random() * endpoints.length)],
        method: methods[Math.floor(Math.random() * methods.length)],
        durationMs: Math.round(latency),
        statusCode,
        timestamp: now - age,
      });
    }

    // Generate some error timestamps
    for (let i = 0; i < 3; i++) {
      this.errorTimestamps.push(now - Math.random() * WINDOW_MS);
    }

    this.sessionCount = Math.floor(Math.random() * 50) + 10;
    this.fpsEstimate = 55 + Math.floor(Math.random() * 10);
    this.jsBusyRatio = Math.random() * 0.3;

    appLogger.infoSync('[HealthMetrics] Demo data seeded');
  }
}

export const healthMetricsService = new HealthMetricsService();
export default healthMetricsService;
