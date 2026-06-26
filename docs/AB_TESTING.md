# A/B Testing Process

TeachLink mobile uses `abTestingService` to assign users to experiment variants, track exposure, record metrics per variant, and evaluate statistical significance.

## Create an Experiment

1. Add an `ExperimentConfig` with at least two variants and positive weights.
2. Register the experiment through `abTestingService.registerExperiment` or add it to `performanceExperiments`.
3. Use a stable assignment key such as `userId`. Anonymous flows can pass a device or session identifier.
4. Call `trackExposure` when the user can experience the variant.
5. Call `trackMetric` for outcome metrics. Performance experiments should use durations, counts, or failure rates that are already meaningful to the team.

## Analyze Results

Use `calculateMetricSignificance` for numeric samples such as render duration, startup time, or image prefetch duration. Use `calculateConversionSignificance` for rates such as completion or error-free sessions.

Before shipping a winning variant:

- Confirm the primary metric is statistically significant at the agreed confidence level.
- Check guardrail metrics such as crash rate, API errors, and session length.
- Keep assignment stable until the experiment is stopped.
- Document the decision and remove stale experiment code after rollout.

## Current Performance Experiment

`image_prefetch_delay_v1` compares immediate image prefetching against a short delay. The goal is to measure whether delaying non-critical prefetch work improves startup and image prefetch duration without increasing failed prefetches.

Team training checklist:

- Review how variant assignment is deterministic and persisted.
- Review exposure tracking versus metric tracking.
- Review p-values, confidence level, and the difference between statistical and product significance.
- Practice reading the `image_prefetch_delay_v1` test as a template for future performance experiments.
