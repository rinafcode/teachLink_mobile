import AsyncStorage from '@react-native-async-storage/async-storage';

import { abTestingService, ExperimentConfig } from '../../src/services/abTesting';
import { mobileAnalyticsService } from '../../src/services/mobileAnalytics';
import {
  getImagePrefetchExperimentDecision,
  IMAGE_PREFETCH_EXPERIMENT_ID,
  trackImagePrefetchMetric,
} from '../../src/services/performanceExperiments';
import { AnalyticsEvent } from '../../src/utils/trackingEvents';

jest.mock('../../src/services/mobileAnalytics', () => ({
  __esModule: true,
  default: {
    trackEvent: jest.fn(),
    trackPerformance: jest.fn(),
  },
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockAnalytics = mobileAnalyticsService as jest.Mocked<typeof mobileAnalyticsService>;

const experiment: ExperimentConfig = {
  id: 'button_render_v1',
  name: 'Button render path',
  description: 'Compares two button render paths.',
  enabled: true,
  variants: [
    { id: 'control', name: 'Control', weight: 50 },
    { id: 'optimized', name: 'Optimized', weight: 50 },
  ],
};

describe('abTestingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    abTestingService.registerExperiment(experiment);
  });

  it('assigns and persists a deterministic variant', async () => {
    const first = await abTestingService.getAssignment(experiment.id, 'user-123');
    const second = await abTestingService.getAssignment(experiment.id, 'user-123');

    expect(first?.variantId).toBe(second?.variantId);
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      '@teachlink_ab_assignment:button_render_v1:user-123',
      expect.stringContaining('"assignmentKey":"user-123"')
    );
    expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
      AnalyticsEvent.AB_ASSIGNMENT,
      expect.objectContaining({
        ab_experiment_id: experiment.id,
        ab_assignment_key: 'user-123',
      })
    );
  });

  it('reuses a stored assignment when the variant is still valid', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce(
      JSON.stringify({
        experimentId: experiment.id,
        variantId: 'optimized',
        assignedAt: '2026-05-28T00:00:00.000Z',
        assignmentKey: 'user-456',
      })
    );

    const assignment = await abTestingService.getAssignment(experiment.id, 'user-456');

    expect(assignment?.variantId).toBe('optimized');
    expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('tracks exposures with experiment and variant metadata', async () => {
    const assignment = await abTestingService.trackExposure(experiment.id, 'user-789', {
      screen: 'home',
    });

    expect(assignment).not.toBeNull();
    expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
      AnalyticsEvent.AB_EXPOSURE,
      expect.objectContaining({
        screen: 'home',
        ab_experiment_id: experiment.id,
        ab_variant_id: assignment?.variantId,
      })
    );
  });

  it('tracks performance metrics per assigned variant', async () => {
    const metric = await abTestingService.trackMetric(
      experiment.id,
      'render_duration',
      42,
      'user-101',
      { component: 'PrimaryButton' }
    );

    expect(metric).toEqual(
      expect.objectContaining({
        experimentId: experiment.id,
        name: 'render_duration',
        value: 42,
      })
    );
    expect(mockAnalytics.trackPerformance).toHaveBeenCalledWith(
      'render_duration',
      42,
      expect.objectContaining({
        component: 'PrimaryButton',
        ab_experiment_id: experiment.id,
        ab_variant_id: metric?.variantId,
      })
    );
  });

  it('calculates statistical significance for numeric performance samples', () => {
    const result = abTestingService.calculateMetricSignificance(
      [100, 102, 98, 101, 99],
      [80, 81, 79, 82, 78]
    );

    expect(result.variantMean).toBeLessThan(result.controlMean);
    expect(result.pValue).toBeLessThan(0.05);
    expect(result.isSignificant).toBe(true);
  });

  it('calculates conversion significance for proportion metrics', () => {
    const result = abTestingService.calculateConversionSignificance(100, 1000, 140, 1000);

    expect(result.variantRate).toBe(0.14);
    expect(result.controlRate).toBe(0.1);
    expect(result.isSignificant).toBe(true);
  });

  it('provides a concrete performance optimization experiment decision', async () => {
    const decision = await getImagePrefetchExperimentDecision('user-202');

    expect(decision.assignment?.experimentId).toBe(IMAGE_PREFETCH_EXPERIMENT_ID);
    expect([0, 250]).toContain(decision.delayMs);
    expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
      AnalyticsEvent.AB_EXPOSURE,
      expect.objectContaining({
        optimization: 'image_prefetch_delay',
        ab_experiment_id: IMAGE_PREFETCH_EXPERIMENT_ID,
      })
    );
  });

  it('tracks the image prefetch performance experiment metric', async () => {
    await trackImagePrefetchMetric(120, 'user-303', 6);

    expect(mockAnalytics.trackPerformance).toHaveBeenCalledWith(
      'image_prefetch_duration',
      120,
      expect.objectContaining({
        prefetched_count: 6,
        ab_experiment_id: IMAGE_PREFETCH_EXPERIMENT_ID,
      })
    );
  });
});
