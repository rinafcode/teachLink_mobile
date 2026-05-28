import abTestingService, { ExperimentAssignment, ExperimentConfig } from './abTesting';

export const IMAGE_PREFETCH_EXPERIMENT_ID = 'image_prefetch_delay_v1';

export const performanceExperiments: ExperimentConfig[] = [
  {
    id: IMAGE_PREFETCH_EXPERIMENT_ID,
    name: 'Image prefetch delay',
    description:
      'Compares immediate image prefetching with a short delay to reduce startup contention.',
    enabled: true,
    variants: [
      {
        id: 'control_immediate',
        name: 'Immediate prefetch',
        weight: 50,
        description: 'Prefetch images as soon as the hook mounts.',
      },
      {
        id: 'delayed_prefetch',
        name: 'Delayed prefetch',
        weight: 50,
        description: 'Wait briefly before prefetching to leave startup work on the main path.',
      },
    ],
  },
];

abTestingService.registerExperiments(performanceExperiments);

export interface ImagePrefetchExperimentDecision {
  assignment: ExperimentAssignment | null;
  delayMs: number;
}

export async function getImagePrefetchExperimentDecision(
  assignmentKey: string = 'anonymous',
): Promise<ImagePrefetchExperimentDecision> {
  const assignment = await abTestingService.trackExposure(
    IMAGE_PREFETCH_EXPERIMENT_ID,
    assignmentKey,
    { optimization: 'image_prefetch_delay' },
  );

  return {
    assignment,
    delayMs: assignment?.variantId === 'delayed_prefetch' ? 250 : 0,
  };
}

export async function trackImagePrefetchMetric(
  durationMs: number,
  assignmentKey: string = 'anonymous',
  prefetchedCount: number = 0,
): Promise<void> {
  await abTestingService.trackMetric(
    IMAGE_PREFETCH_EXPERIMENT_ID,
    'image_prefetch_duration',
    durationMs,
    assignmentKey,
    { prefetched_count: prefetchedCount },
  );
}
