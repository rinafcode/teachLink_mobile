import { beforeEach, describe, expect, it } from '@jest/globals';
import { useHealthDashboardStore, selectIsServiceDegraded } from '../../src/store/healthDashboardStore';
import { useFeatureFlagStore } from '../../src/store/featureFlagStore';
import { HEALTH_TO_FEATURE_MAP } from '../../src/config/degradationConfig';

function makeSnapshot(overrides = {}) {
  return {
    capturedAt: Date.now(),
    crashCount: 0, errorCount: 0, crashRate: 0, errorRatePerMinute: 0,
    apiLatencyP50: 50, apiLatencyP95: 100, apiLatencyP99: 200,
    apiCallCount: 10, apiErrorCount: 0, apiErrorRate: 0,
    activeSessions: 5, totalSessionsInWindow: 5,
    fps: 60, jsBusyRatio: 0.1, isOnline: true, networkType: 'wifi',
    ...overrides,
  };
}

beforeEach(() => {
  useHealthDashboardStore.getState().reset();
  useFeatureFlagStore.setState(state => ({
    flags: {
      ...state.flags,
      flags: { ...state.flags.flags, streaming_courses: { enabled: true }, payment_form: { enabled: true } },
    },
  }));
});

describe('Health-check to Feature Flag auto-disable', () => {

  describe('Degradation', () => {
    it('disables streaming_courses when streaming is degraded', () => {
      useHealthDashboardStore.getState().setSnapshot(makeSnapshot(), [{ service: 'streaming', status: 'degraded' }]);
      expect(useFeatureFlagStore.getState().isEnabled('streaming_courses', true)).toBe(false);
    });

    it('disables streaming_courses when streaming status is down', () => {
      useHealthDashboardStore.getState().setSnapshot(makeSnapshot(), [{ service: 'streaming', status: 'down' }]);
      expect(useFeatureFlagStore.getState().isEnabled('streaming_courses', true)).toBe(false);
    });

    it('disables payment_form when payment is degraded', () => {
      useHealthDashboardStore.getState().setSnapshot(makeSnapshot(), [{ service: 'payment', status: 'degraded' }]);
      expect(useFeatureFlagStore.getState().isEnabled('payment_form', true)).toBe(false);
    });
  });

  describe('Fallback UI state', () => {
    it('selectIsServiceDegraded returns true for a degraded service', () => {
      useHealthDashboardStore.getState().setSnapshot(makeSnapshot(), [{ service: 'streaming', status: 'degraded' }]);
      expect(selectIsServiceDegraded('streaming')(useHealthDashboardStore.getState())).toBe(true);
    });

    it('selectIsServiceDegraded returns false for a healthy service', () => {
      useHealthDashboardStore.getState().setSnapshot(makeSnapshot(), [{ service: 'streaming', status: 'healthy' }]);
      expect(selectIsServiceDegraded('streaming')(useHealthDashboardStore.getState())).toBe(false);
    });

    it('selectIsServiceDegraded returns false when no status recorded yet', () => {
      expect(selectIsServiceDegraded('streaming')(useHealthDashboardStore.getState())).toBe(false);
    });
  });

  describe('Recovery', () => {
    it('re-enables streaming_courses after recovery', () => {
      useHealthDashboardStore.getState().setSnapshot(makeSnapshot(), [{ service: 'streaming', status: 'degraded' }]);
      expect(useFeatureFlagStore.getState().isEnabled('streaming_courses', true)).toBe(false);
      useHealthDashboardStore.getState().setSnapshot(makeSnapshot(), [{ service: 'streaming', status: 'healthy' }]);
      expect(useFeatureFlagStore.getState().isEnabled('streaming_courses', true)).toBe(true);
    });

    it('re-enables payment_form after payment service recovers', () => {
      useHealthDashboardStore.getState().setSnapshot(makeSnapshot(), [{ service: 'payment', status: 'down' }]);
      expect(useFeatureFlagStore.getState().isEnabled('payment_form', true)).toBe(false);
      useHealthDashboardStore.getState().setSnapshot(makeSnapshot(), [{ service: 'payment', status: 'healthy' }]);
      expect(useFeatureFlagStore.getState().isEnabled('payment_form', true)).toBe(true);
    });

    it('only re-enables the recovered service, not unrelated flags', () => {
      useHealthDashboardStore.getState().setSnapshot(makeSnapshot(), [
        { service: 'streaming', status: 'degraded' },
        { service: 'payment', status: 'degraded' },
      ]);
      useHealthDashboardStore.getState().setSnapshot(makeSnapshot(), [
        { service: 'streaming', status: 'healthy' },
        { service: 'payment', status: 'degraded' },
      ]);
      expect(useFeatureFlagStore.getState().isEnabled('streaming_courses', true)).toBe(true);
      expect(useFeatureFlagStore.getState().isEnabled('payment_form', true)).toBe(false);
    });
  });

  describe('Admin override', () => {
    it('does NOT disable the flag when adminOverride is true', () => {
      const original = HEALTH_TO_FEATURE_MAP.streaming[0].adminOverride;
      HEALTH_TO_FEATURE_MAP.streaming[0].adminOverride = true;
      try {
        useHealthDashboardStore.getState().setSnapshot(makeSnapshot(), [{ service: 'streaming', status: 'degraded' }]);
        expect(useFeatureFlagStore.getState().isEnabled('streaming_courses', true)).toBe(true);
      } finally {
        HEALTH_TO_FEATURE_MAP.streaming[0].adminOverride = original;
      }
    });
  });

  describe('Backward compatibility', () => {
    it('does not crash when setSnapshot is called without serviceStatuses', () => {
      useHealthDashboardStore.getState().setSnapshot(makeSnapshot());
      expect(useFeatureFlagStore.getState().isEnabled('streaming_courses', true)).toBe(true);
      expect(useFeatureFlagStore.getState().isEnabled('payment_form', true)).toBe(true);
    });
  });

});
