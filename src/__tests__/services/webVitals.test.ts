import { mobileAnalyticsService } from '../../services/mobileAnalytics';
import {
  clearBaselines,
  handleMetric,
  setBaseline,
  WEB_VITALS_THRESHOLDS,
} from '../../services/webVitals';
import { AnalyticsEvent, PerformanceMetric } from '../../utils/trackingEvents';

jest.mock('../../services/mobileAnalytics', () => ({
  mobileAnalyticsService: { trackEvent: jest.fn() },
}));

const trackEvent = mobileAnalyticsService.trackEvent as jest.Mock;

function makeMetric(value: number, delta = value) {
  return { value, delta, id: 'test-id', name: 'LCP', navigationType: 'navigate' } as any;
}

beforeEach(() => {
  trackEvent.mockClear();
  clearBaselines();
});

describe('WEB_VITALS_THRESHOLDS', () => {
  it('defines thresholds for all 5 vitals', () => {
    const keys = [
      PerformanceMetric.LCP,
      PerformanceMetric.FID,
      PerformanceMetric.CLS,
      PerformanceMetric.FCP,
      PerformanceMetric.TTFB,
    ];
    keys.forEach(k => {
      expect(WEB_VITALS_THRESHOLDS[k]).toHaveProperty('good');
      expect(WEB_VITALS_THRESHOLDS[k]).toHaveProperty('needsImprovement');
    });
  });
});

describe('handleMetric — rating', () => {
  it('reports "good" for LCP <= 2500ms', () => {
    handleMetric(PerformanceMetric.LCP, makeMetric(2000));
    expect(trackEvent).toHaveBeenCalledWith(
      AnalyticsEvent.WEB_VITALS_LCP,
      expect.objectContaining({ metric_rating: 'good' })
    );
  });

  it('reports "needs-improvement" for LCP between 2500 and 4000ms', () => {
    handleMetric(PerformanceMetric.LCP, makeMetric(3000));
    expect(trackEvent).toHaveBeenCalledWith(
      AnalyticsEvent.WEB_VITALS_LCP,
      expect.objectContaining({ metric_rating: 'needs-improvement' })
    );
  });

  it('reports "poor" for LCP > 4000ms', () => {
    handleMetric(PerformanceMetric.LCP, makeMetric(5000));
    expect(trackEvent).toHaveBeenCalledWith(
      AnalyticsEvent.WEB_VITALS_LCP,
      expect.objectContaining({ metric_rating: 'poor' })
    );
  });

  it('reports "good" for CLS <= 0.1', () => {
    handleMetric(PerformanceMetric.CLS, makeMetric(0.05));
    expect(trackEvent).toHaveBeenCalledWith(
      AnalyticsEvent.WEB_VITALS_CLS,
      expect.objectContaining({ metric_rating: 'good' })
    );
  });
});

describe('handleMetric — analytics event mapping', () => {
  const cases: [PerformanceMetric, AnalyticsEvent][] = [
    [PerformanceMetric.LCP,  AnalyticsEvent.WEB_VITALS_LCP],
    [PerformanceMetric.FID,  AnalyticsEvent.WEB_VITALS_FID],
    [PerformanceMetric.CLS,  AnalyticsEvent.WEB_VITALS_CLS],
    [PerformanceMetric.FCP,  AnalyticsEvent.WEB_VITALS_FCP],
    [PerformanceMetric.TTFB, AnalyticsEvent.WEB_VITALS_TTFB],
  ];

  test.each(cases)('%s maps to %s', (metric, event) => {
    handleMetric(metric, makeMetric(100));
    expect(trackEvent).toHaveBeenCalledWith(event, expect.any(Object));
  });
});

describe('handleMetric — regression detection', () => {
  it('sets baseline on first reading and does not fire regression event', () => {
    handleMetric(PerformanceMetric.LCP, makeMetric(2000));
    const calls = trackEvent.mock.calls.map(c => c[0]);
    expect(calls).not.toContain(AnalyticsEvent.WEB_VITALS_REGRESSION);
  });

  it('fires regression event when value is >20% above baseline', () => {
    setBaseline(PerformanceMetric.LCP, 2000);
    handleMetric(PerformanceMetric.LCP, makeMetric(2500)); // 25% worse
    expect(trackEvent).toHaveBeenCalledWith(
      AnalyticsEvent.WEB_VITALS_REGRESSION,
      expect.objectContaining({
        metric_name: PerformanceMetric.LCP,
        baseline_value: 2000,
      })
    );
  });

  it('does not fire regression event when value is within 20% of baseline', () => {
    setBaseline(PerformanceMetric.LCP, 2000);
    handleMetric(PerformanceMetric.LCP, makeMetric(2300)); // 15% worse — OK
    const calls = trackEvent.mock.calls.map(c => c[0]);
    expect(calls).not.toContain(AnalyticsEvent.WEB_VITALS_REGRESSION);
  });

  it('includes regression_pct in the regression event payload', () => {
    setBaseline(PerformanceMetric.TTFB, 800);
    handleMetric(PerformanceMetric.TTFB, makeMetric(1000)); // 25% worse
    expect(trackEvent).toHaveBeenCalledWith(
      AnalyticsEvent.WEB_VITALS_REGRESSION,
      expect.objectContaining({ regression_pct: 25 })
    );
  });
});

describe('setBaseline / clearBaselines', () => {
  it('clearBaselines resets so next reading becomes new baseline', () => {
    setBaseline(PerformanceMetric.FCP, 1000);
    clearBaselines();
    // First reading after clear should not trigger regression
    handleMetric(PerformanceMetric.FCP, makeMetric(5000));
    const calls = trackEvent.mock.calls.map(c => c[0]);
    expect(calls).not.toContain(AnalyticsEvent.WEB_VITALS_REGRESSION);
  });
});
