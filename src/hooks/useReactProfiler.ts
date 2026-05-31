import { useCallback, useRef } from 'react';
import { mobileAnalyticsService } from '../services/mobileAnalytics';
import { AnalyticsEvent, PerformanceMetric } from '../utils/trackingEvents';
import { appLogger } from '../utils/logger';

export interface ProfilerMetrics {
  componentName: string;
  renderCount: number;
  lastRenderDurationMs: number;
  lastCommitDurationMs: number;
  averageRenderDurationMs: number;
  slowRenders: number;
}

export interface ProfilerOptions {
  slowRenderThresholdMs?: number;
  maxSamples?: number;
}

export type ProfilerOnRenderCallback = (
  id: string,
  phase: 'mount' | 'update' | 'nested-update',
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number
) => void;

const DEFAULT_SLOW_THRESHOLD_MS = 16;
const DEFAULT_MAX_SAMPLES = 100;

/**
 * Provides a React Profiler `onRender` callback that records render timing
 * metrics and forwards slow renders to the analytics service.
 *
 * Usage:
 *   const { onRender, metrics } = useReactProfiler('MyScreen');
 *   <Profiler id="MyScreen" onRender={onRender}>…</Profiler>
 */
export function useReactProfiler(
  componentName: string,
  options: ProfilerOptions = {}
): { onRender: ProfilerOnRenderCallback; metrics: ProfilerMetrics } {
  const { slowRenderThresholdMs = DEFAULT_SLOW_THRESHOLD_MS, maxSamples = DEFAULT_MAX_SAMPLES } =
    options;

  const renderCount = useRef(0);
  const totalDuration = useRef(0);
  const slowRenders = useRef(0);
  const lastRenderDurationMs = useRef(0);
  const lastCommitDurationMs = useRef(0);
  const samples = useRef<number[]>([]);

  const onRender = useCallback<ProfilerOnRenderCallback>(
    (_id, phase, actualDuration, _baseDuration, _startTime, commitTime) => {
      renderCount.current += 1;
      lastRenderDurationMs.current = actualDuration;
      lastCommitDurationMs.current = commitTime;

      samples.current.push(actualDuration);
      if (samples.current.length > maxSamples) {
        samples.current.shift();
      }
      totalDuration.current += actualDuration;

      if (actualDuration > slowRenderThresholdMs) {
        slowRenders.current += 1;

        appLogger.infoSync(
          `[ReactProfiler] Slow render detected — ${componentName} (${phase}): ${actualDuration.toFixed(2)}ms`
        );

        mobileAnalyticsService.trackEvent(AnalyticsEvent.PERFORMANCE_METRIC, {
          metric_name: PerformanceMetric.RENDER_DURATION,
          component: componentName,
          phase,
          actual_duration_ms: Math.round(actualDuration),
          commit_time: commitTime,
          is_slow: true,
        });
      }

      mobileAnalyticsService.trackPerformance(PerformanceMetric.RENDER_DURATION, actualDuration, {
        component: componentName,
        phase,
        render_count: renderCount.current,
        event_category: 'high_frequency',
        event_name: `profiler_${componentName}`,
      });
    },
    [componentName, slowRenderThresholdMs, maxSamples]
  );

  const sampleArr = samples.current;
  const avg =
    sampleArr.length > 0
      ? sampleArr.reduce((a, b) => a + b, 0) / sampleArr.length
      : 0;

  const metrics: ProfilerMetrics = {
    componentName,
    renderCount: renderCount.current,
    lastRenderDurationMs: lastRenderDurationMs.current,
    lastCommitDurationMs: lastCommitDurationMs.current,
    averageRenderDurationMs: avg,
    slowRenders: slowRenders.current,
  };

  return { onRender, metrics };
}

export default useReactProfiler;
