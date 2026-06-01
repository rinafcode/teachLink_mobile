import { mobileAnalyticsService } from './mobileAnalytics';
import { appLogger } from '../utils/logger';
import { AnalyticsEvent, PerformanceMetric } from '../utils/trackingEvents';

import type { Metric } from 'web-vitals';

/**
 * Google's recommended thresholds for Core Web Vitals.
 * "good" = passes, "needsImprovement" = warning, above = poor.
 */
export const WEB_VITALS_THRESHOLDS: Record<
  PerformanceMetric.LCP | PerformanceMetric.FID | PerformanceMetric.CLS | PerformanceMetric.FCP | PerformanceMetric.TTFB,
  { good: number; needsImprovement: number }
> = {
  [PerformanceMetric.LCP]:  { good: 2500,  needsImprovement: 4000  },
  [PerformanceMetric.FID]:  { good: 100,   needsImprovement: 300   },
  [PerformanceMetric.CLS]:  { good: 0.1,   needsImprovement: 0.25  },
  [PerformanceMetric.FCP]:  { good: 1800,  needsImprovement: 3000  },
  [PerformanceMetric.TTFB]: { good: 800,   needsImprovement: 1800  },
};

export type VitalRating = 'good' | 'needs-improvement' | 'poor';

export interface VitalReport {
  name: PerformanceMetric;
  value: number;
  rating: VitalRating;
  delta: number;
  id: string;
}

/** Stored baselines for regression detection (keyed by metric name). */
const baselines = new Map<string, number>();

function getRating(
  metric: PerformanceMetric.LCP | PerformanceMetric.FID | PerformanceMetric.CLS | PerformanceMetric.FCP | PerformanceMetric.TTFB,
  value: number
): VitalRating {
  const { good, needsImprovement } = WEB_VITALS_THRESHOLDS[metric];
  if (value <= good) return 'good';
  if (value <= needsImprovement) return 'needs-improvement';
  return 'poor';
}

function toAnalyticsEvent(metric: PerformanceMetric): AnalyticsEvent {
  const map: Record<string, AnalyticsEvent> = {
    [PerformanceMetric.LCP]:  AnalyticsEvent.WEB_VITALS_LCP,
    [PerformanceMetric.FID]:  AnalyticsEvent.WEB_VITALS_FID,
    [PerformanceMetric.CLS]:  AnalyticsEvent.WEB_VITALS_CLS,
    [PerformanceMetric.FCP]:  AnalyticsEvent.WEB_VITALS_FCP,
    [PerformanceMetric.TTFB]: AnalyticsEvent.WEB_VITALS_TTFB,
  };
  return map[metric] ?? AnalyticsEvent.PERFORMANCE_METRIC;
}

function handleMetric(perfMetric: PerformanceMetric, raw: Metric): void {
  const rating = getRating(
    perfMetric as PerformanceMetric.LCP | PerformanceMetric.FID | PerformanceMetric.CLS | PerformanceMetric.FCP | PerformanceMetric.TTFB,
    raw.value
  );

  const report: VitalReport = {
    name: perfMetric,
    value: raw.value,
    rating,
    delta: raw.delta,
    id: raw.id,
  };

  // Report to analytics
  mobileAnalyticsService.trackEvent(toAnalyticsEvent(perfMetric), {
    metric_name: perfMetric,
    metric_value: raw.value,
    metric_delta: raw.delta,
    metric_rating: rating,
    metric_id: raw.id,
  });

  appLogger.infoSync(`[WebVitals] ${perfMetric}: ${raw.value} (${rating})`);

  // Regression detection: alert if value is >20% worse than stored baseline
  const baseline = baselines.get(perfMetric);
  if (baseline !== undefined) {
    const regressionThreshold = baseline * 1.2;
    if (raw.value > regressionThreshold) {
      appLogger.infoSync(
        `[WebVitals] Regression detected for ${perfMetric}: ${raw.value} > baseline ${baseline}`
      );
      mobileAnalyticsService.trackEvent(AnalyticsEvent.WEB_VITALS_REGRESSION, {
        metric_name: perfMetric,
        metric_value: raw.value,
        baseline_value: baseline,
        regression_pct: Math.round(((raw.value - baseline) / baseline) * 100),
      });
    }
  } else {
    // First reading becomes the baseline
    baselines.set(perfMetric, raw.value);
  }

  return report as unknown as void; // typed void for callback compatibility
}

/**
 * Initialise Core Web Vitals collection.
 * Safe to call in React Native / non-browser environments — the web-vitals
 * functions are no-ops when the browser Performance API is unavailable.
 */
export function init(): void {
  // Dynamic import keeps the web-vitals bundle out of the critical path and
  // avoids hard failures in environments where the APIs don't exist.
  import('web-vitals')
    .then(({ onLCP, onFID, onCLS, onFCP, onTTFB }) => {
      onLCP((m)  => handleMetric(PerformanceMetric.LCP,  m));
      onFID((m)  => handleMetric(PerformanceMetric.FID,  m));
      onCLS((m)  => handleMetric(PerformanceMetric.CLS,  m));
      onFCP((m)  => handleMetric(PerformanceMetric.FCP,  m));
      onTTFB((m) => handleMetric(PerformanceMetric.TTFB, m));
      appLogger.infoSync('[WebVitals] Monitoring initialised');
    })
    .catch((err) => {
      appLogger.infoSync(`[WebVitals] Failed to load web-vitals: ${err}`);
    });
}

/** Exposed for testing — allows injecting a known baseline. */
export function setBaseline(metric: PerformanceMetric, value: number): void {
  baselines.set(metric, value);
}

/** Exposed for testing — clears all stored baselines. */
export function clearBaselines(): void {
  baselines.clear();
}

/** Exposed for testing — directly invoke the metric handler. */
export { handleMetric };

const webVitalsService = { init, setBaseline, clearBaselines };
export default webVitalsService;
