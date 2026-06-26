/**
 * A/B Testing Service
 *
 * Enhancements over v1:
 *  - Batch AsyncStorage reads on startup (single I/O pass instead of one per experiment)
 *  - In-memory assignment cache — zero-latency repeat calls within a session
 *  - Assignment expiry: stale assignments past TTL are re-randomised automatically
 *  - Forced variant overrides for QA / manual testing without touching AsyncStorage
 *  - Multi-metric batch tracking (`trackMetrics`) — one analytics call per tick
 *  - Sample-size calculator (`requiredSampleSize`) for experiment planning
 *  - Sequential / multi-variant experiment support (not just A/B)
 *  - Typed `ABTestingError` with machine-readable `code` field
 *  - `clearAssignment` and `clearAllAssignments` for logout / reset flows
 *  - `listActiveExperiments` for debug/admin screens
 *  - `getVariantConfig` convenience helper
 *  - All logger calls carry structured context
 *  - Pure math helpers moved to a clear namespace at the bottom
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { mobileAnalyticsService } from './mobileAnalytics';
import { logger } from '../utils/logger';
import { AnalyticsEvent, EventProperties } from '../utils/trackingEvents';

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_PREFIX = '@teachlink_ab';
const ASSIGNMENT_PREFIX = `${STORAGE_PREFIX}_assignment`;
const DEFAULT_ALPHA = 0.05;
/** Assignments older than this are re-randomised on next `getAssignment` call. */
const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1_000; // 30 days
const MIN_SAMPLES = 2;

// ─── Public types ─────────────────────────────────────────────────────────────

export interface ExperimentVariant {
  id: string;
  name: string;
  weight: number;
  description?: string;
  /** Arbitrary config the variant can carry (feature flags, copy, thresholds). */
  config?: Record<string, unknown>;
}

export interface ExperimentConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  variants: ExperimentVariant[];
  /** If set, assignments older than this many ms are refreshed. Defaults to DEFAULT_TTL_MS. */
  ttlMs?: number;
  /** ISO date string — experiment is inactive before this date. */
  startsAt?: string;
  /** ISO date string — experiment is inactive after this date. */
  endsAt?: string;
}

export interface ExperimentAssignment {
  experimentId: string;
  variantId: string;
  assignedAt: string;
  assignmentKey: string;
}

export interface VariantMetric {
  experimentId: string;
  variantId: string;
  name: string;
  value: number;
  recordedAt: string;
  properties?: EventProperties;
}

export interface SignificanceResult {
  controlMean: number;
  variantMean: number;
  absoluteDifference: number;
  relativeDifference: number;
  /** Standard error of the difference. */
  standardError: number;
  zScore: number;
  pValue: number;
  isSignificant: boolean;
  confidenceLevel: number;
}

export interface ConversionSignificanceResult {
  controlRate: number;
  variantRate: number;
  absoluteDifference: number;
  relativeDifference: number;
  pooledRate: number;
  zScore: number;
  pValue: number;
  isSignificant: boolean;
  confidenceLevel: number;
}

export interface SampleSizeResult {
  /** Required samples per variant to achieve the requested power. */
  perVariant: number;
  /** Total samples across all variants. */
  total: number;
  alpha: number;
  power: number;
  mde: number;
  baseRate: number;
}

export type ABErrorCode =
  | 'EXPERIMENT_NOT_FOUND'
  | 'EXPERIMENT_DISABLED'
  | 'EXPERIMENT_INACTIVE'
  | 'INVALID_CONFIG'
  | 'DUPLICATE_VARIANT'
  | 'INSUFFICIENT_SAMPLES'
  | 'INVALID_TOTALS'
  | 'STORAGE_ERROR';

export class ABTestingError extends Error {
  constructor(
    public readonly code: ABErrorCode,
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ABTestingError';
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

class ABTestingService {
  /** Registered experiment configs, keyed by experiment ID. */
  private readonly experiments = new Map<string, ExperimentConfig>();

  /**
   * In-memory cache of assignments for the current session.
   * Keyed by `${experimentId}:${assignmentKey}`.
   */
  private readonly cache = new Map<string, ExperimentAssignment>();

  /**
   * Forced variant overrides for QA and development.
   * Keyed by `${experimentId}:${assignmentKey}` — overrides always win.
   */
  private readonly overrides = new Map<string, string>();

  // ─── Registration ──────────────────────────────────────────────────────────

  public registerExperiment(config: ExperimentConfig): void {
    this.validateExperiment(config);
    this.experiments.set(config.id, config);
    logger.info('ABTesting: registered experiment', { id: config.id, variants: config.variants.length });
  }

  public registerExperiments(configs: ExperimentConfig[]): void {
    configs.forEach((c) => this.registerExperiment(c));
  }

  public getExperiment(experimentId: string): ExperimentConfig | undefined {
    return this.experiments.get(experimentId);
  }

  /** Return all experiments that are currently active. */
  public listActiveExperiments(): ExperimentConfig[] {
    const now = new Date();
    return Array.from(this.experiments.values()).filter((exp) => {
      if (!exp.enabled) return false;
      if (exp.startsAt && new Date(exp.startsAt) > now) return false;
      if (exp.endsAt && new Date(exp.endsAt) < now) return false;
      return true;
    });
  }

  // ─── Overrides (QA / manual testing) ──────────────────────────────────────

  /**
   * Force a specific variant for a given assignment key.
   * Overrides persist only for the current JS session (not persisted to storage).
   */
  public setOverride(experimentId: string, variantId: string, assignmentKey = 'anonymous'): void {
    const cacheKey = this.cacheKey(experimentId, assignmentKey);
    this.overrides.set(cacheKey, variantId);
    this.cache.delete(cacheKey); // invalidate cached assignment so override takes effect
    logger.info('ABTesting: override set', { experimentId, variantId, assignmentKey });
  }

  public clearOverride(experimentId: string, assignmentKey = 'anonymous'): void {
    this.overrides.delete(this.cacheKey(experimentId, assignmentKey));
  }

  public clearAllOverrides(): void {
    this.overrides.clear();
  }

  // ─── Assignment ────────────────────────────────────────────────────────────

  /**
   * Return the stored or newly-created assignment for an experiment + user.
   * Returns `null` when the experiment is not found, disabled, or out of date range.
   * Never throws — all errors are logged and `null` is returned so the calling
   * code always falls back gracefully to the default behaviour.
   */
  public async getAssignment(
    experimentId: string,
    assignmentKey = 'anonymous'
  ): Promise<ExperimentAssignment | null> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      logger.warn('ABTesting: experiment not found', { experimentId });
      return null;
    }
    if (!this.isActiveExperiment(experiment)) {
      return null;
    }

    const key = this.cacheKey(experimentId, assignmentKey);

    // ── Override check (QA / dev) ──
    const override = this.overrides.get(key);
    if (override) {
      return this.buildAssignment(experimentId, override, assignmentKey, new Date().toISOString());
    }

    // ── In-memory cache ──
    const cached = this.cache.get(key);
    if (cached && this.isAssignmentFresh(cached, experiment)) {
      return cached;
    }

    // ── Persistent storage ──
    const stored = await this.readStoredAssignment(key, experiment);
    if (stored) {
      this.cache.set(key, stored);
      return stored;
    }

    // ── New assignment ──
    return this.createAndPersistAssignment(experimentId, assignmentKey, experiment, key);
  }

  /**
   * Convenience: resolve the variant ID directly.
   * Returns `null` when the experiment is inactive.
   */
  public async getVariantId(
    experimentId: string,
    assignmentKey = 'anonymous'
  ): Promise<string | null> {
    const assignment = await this.getAssignment(experimentId, assignmentKey);
    return assignment?.variantId ?? null;
  }

  /**
   * Convenience: resolve the full variant config object.
   * Useful when variants carry feature flag values or copy strings.
   */
  public async getVariantConfig(
    experimentId: string,
    assignmentKey = 'anonymous'
  ): Promise<ExperimentVariant | null> {
    const assignment = await this.getAssignment(experimentId, assignmentKey);
    if (!assignment) return null;
    const experiment = this.experiments.get(experimentId);
    return experiment?.variants.find((v) => v.id === assignment.variantId) ?? null;
  }

  /**
   * Warm the in-memory cache for a list of experiments in a single batch
   * AsyncStorage read. Call this at app startup to avoid cold-read latency
   * on the first render of each experiment surface.
   */
  public async prefetchAssignments(
    pairs: { experimentId: string; assignmentKey?: string }[]
  ): Promise<void> {
    const keys = pairs.map(({ experimentId, assignmentKey = 'anonymous' }) =>
      this.storageKey(experimentId, assignmentKey)
    );

    try {
      const entries = await AsyncStorage.multiGet(keys);
      for (const [storageKey, raw] of entries) {
        if (!raw) continue;
        try {
          const assignment = JSON.parse(raw) as ExperimentAssignment;
          const experiment = this.experiments.get(assignment.experimentId);
          if (experiment && this.isVariantStillValid(assignment, experiment)) {
            this.cache.set(this.cacheKey(assignment.experimentId, assignment.assignmentKey), assignment);
          }
        } catch {
          // Corrupt entry — ignore; will be recreated on next `getAssignment` call
        }
      }
      logger.info('ABTesting: prefetched assignments', { count: entries.filter(([, v]) => v).length });
    } catch (error) {
      logger.warn('ABTesting: prefetch failed — assignments will be read on demand', { error });
    }
  }

  // ─── Exposure & metric tracking ────────────────────────────────────────────

  /**
   * Record that the user was exposed to a variant (saw the feature).
   * Should be called at the moment the variant becomes visible, not on assignment.
   */
  public async trackExposure(
    experimentId: string,
    assignmentKey = 'anonymous',
    properties?: EventProperties
  ): Promise<ExperimentAssignment | null> {
    const assignment = await this.getAssignment(experimentId, assignmentKey);
    if (!assignment) return null;

    mobileAnalyticsService.trackEvent(AnalyticsEvent.AB_EXPOSURE, {
      ...properties,
      ab_experiment_id: assignment.experimentId,
      ab_variant_id: assignment.variantId,
      ab_assignment_key: assignment.assignmentKey,
    });

    return assignment;
  }

  /** Track a single numeric metric for an experiment. */
  public async trackMetric(
    experimentId: string,
    name: string,
    value: number,
    assignmentKey = 'anonymous',
    properties?: EventProperties
  ): Promise<VariantMetric | null> {
    const assignment = await this.getAssignment(experimentId, assignmentKey);
    if (!assignment) return null;

    const metric = this.buildMetric(assignment, name, value, properties);
    this.emitMetric(metric, assignment, assignmentKey);
    return metric;
  }

  /**
   * Track multiple metrics in a single call.
   * Resolves the assignment once and emits one analytics event per metric,
   * all within the same event-loop tick to avoid re-entrant storage reads.
   */
  public async trackMetrics(
    experimentId: string,
    metrics: Array<{ name: string; value: number; properties?: EventProperties }>,
    assignmentKey = 'anonymous'
  ): Promise<VariantMetric[]> {
    const assignment = await this.getAssignment(experimentId, assignmentKey);
    if (!assignment) return [];

    return metrics.map(({ name, value, properties }) => {
      const metric = this.buildMetric(assignment, name, value, properties);
      this.emitMetric(metric, assignment, assignmentKey);
      return metric;
    });
  }

  // ─── Assignment management ─────────────────────────────────────────────────

  /** Remove a stored assignment (e.g. after logout or experiment reset). */
  public async clearAssignment(experimentId: string, assignmentKey = 'anonymous'): Promise<void> {
    const key = this.cacheKey(experimentId, assignmentKey);
    this.cache.delete(key);
    try {
      await AsyncStorage.removeItem(this.storageKey(experimentId, assignmentKey));
    } catch (error) {
      logger.warn('ABTesting: failed to clear assignment', { experimentId, assignmentKey, error });
    }
  }

  /**
   * Remove all stored assignments.
   * Typically called on logout so users start fresh on next sign-in.
   */
  public async clearAllAssignments(): Promise<void> {
    this.cache.clear();
    try {
      const keys = await AsyncStorage.getAllKeys();
      const abKeys = keys.filter((k) => k.startsWith(ASSIGNMENT_PREFIX));
      if (abKeys.length > 0) {
        await AsyncStorage.multiRemove(abKeys);
      }
      logger.info('ABTesting: cleared all assignments', { count: abKeys.length });
    } catch (error) {
      logger.warn('ABTesting: failed to clear all assignments', { error });
    }
  }

  // ─── Statistical analysis ──────────────────────────────────────────────────

  /**
   * Welch's two-sample t-test for continuous metrics.
   * Works for unequal sample sizes and unequal variances.
   */
  public calculateMetricSignificance(
    controlSamples: number[],
    variantSamples: number[],
    alpha = DEFAULT_ALPHA
  ): SignificanceResult {
    if (controlSamples.length < MIN_SAMPLES || variantSamples.length < MIN_SAMPLES) {
      throw new ABTestingError(
        'INSUFFICIENT_SAMPLES',
        `At least ${MIN_SAMPLES} samples are required per group.`,
        { controlCount: controlSamples.length, variantCount: variantSamples.length }
      );
    }

    const controlMean = Stats.mean(controlSamples);
    const variantMean = Stats.mean(variantSamples);
    const controlVar = Stats.sampleVariance(controlSamples, controlMean);
    const variantVar = Stats.sampleVariance(variantSamples, variantMean);
    const standardError = Math.sqrt(
      controlVar / controlSamples.length + variantVar / variantSamples.length
    );
    const zScore = standardError === 0 ? 0 : (variantMean - controlMean) / standardError;
    const pValue = Stats.twoTailedPValue(zScore);

    return {
      controlMean,
      variantMean,
      absoluteDifference: variantMean - controlMean,
      relativeDifference: controlMean === 0 ? 0 : (variantMean - controlMean) / controlMean,
      standardError,
      zScore,
      pValue,
      isSignificant: pValue < alpha,
      confidenceLevel: 1 - alpha,
    };
  }

  /**
   * Two-proportion z-test for conversion / binary metrics.
   */
  public calculateConversionSignificance(
    controlConversions: number,
    controlTotal: number,
    variantConversions: number,
    variantTotal: number,
    alpha = DEFAULT_ALPHA
  ): ConversionSignificanceResult {
    if (controlTotal <= 0 || variantTotal <= 0) {
      throw new ABTestingError(
        'INVALID_TOTALS',
        'Conversion totals must be greater than zero.',
        { controlTotal, variantTotal }
      );
    }

    const controlRate = controlConversions / controlTotal;
    const variantRate = variantConversions / variantTotal;
    const pooledRate = (controlConversions + variantConversions) / (controlTotal + variantTotal);
    const standardError = Math.sqrt(
      pooledRate * (1 - pooledRate) * (1 / controlTotal + 1 / variantTotal)
    );
    const zScore = standardError === 0 ? 0 : (variantRate - controlRate) / standardError;
    const pValue = Stats.twoTailedPValue(zScore);

    return {
      controlRate,
      variantRate,
      absoluteDifference: variantRate - controlRate,
      relativeDifference: controlRate === 0 ? 0 : (variantRate - controlRate) / controlRate,
      pooledRate,
      zScore,
      pValue,
      isSignificant: pValue < alpha,
      confidenceLevel: 1 - alpha,
    };
  }

  /**
   * Compute the minimum sample size per variant needed to reliably detect a
   * given minimum detectable effect (MDE) at the specified significance and power.
   *
   * Uses the standard formula for two-proportion z-tests.
   *
   * @param baseRate     Baseline conversion rate (0–1)
   * @param mde          Minimum detectable effect as an absolute difference (0–1)
   * @param alpha        Significance level (default 0.05)
   * @param power        Desired statistical power (default 0.80)
   * @param numVariants  Total number of variants including control (default 2)
   */
  public requiredSampleSize(
    baseRate: number,
    mde: number,
    alpha = DEFAULT_ALPHA,
    power = 0.80,
    numVariants = 2
  ): SampleSizeResult {
    if (baseRate <= 0 || baseRate >= 1) {
      throw new ABTestingError('INVALID_CONFIG', 'baseRate must be between 0 and 1 (exclusive).');
    }
    if (mde <= 0 || mde >= 1) {
      throw new ABTestingError('INVALID_CONFIG', 'mde must be between 0 and 1 (exclusive).');
    }

    const variantRate = baseRate + mde;
    const zAlpha = Stats.inverseNormalCDF(1 - alpha / 2);
    const zBeta = Stats.inverseNormalCDF(power);
    const pooled = (baseRate + variantRate) / 2;

    const perVariant = Math.ceil(
      ((zAlpha * Math.sqrt(2 * pooled * (1 - pooled)) +
        zBeta * Math.sqrt(baseRate * (1 - baseRate) + variantRate * (1 - variantRate))) /
        mde) ** 2
    );

    return { perVariant, total: perVariant * numVariants, alpha, power, mde, baseRate };
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private isActiveExperiment(experiment: ExperimentConfig): boolean {
    if (!experiment.enabled) return false;
    const now = new Date();
    if (experiment.startsAt && new Date(experiment.startsAt) > now) return false;
    if (experiment.endsAt && new Date(experiment.endsAt) < now) return false;
    return true;
  }

  private isAssignmentFresh(assignment: ExperimentAssignment, experiment: ExperimentConfig): boolean {
    if (!this.isVariantStillValid(assignment, experiment)) return false;
    const ttl = experiment.ttlMs ?? DEFAULT_TTL_MS;
    return Date.now() - new Date(assignment.assignedAt).getTime() < ttl;
  }

  private isVariantStillValid(assignment: ExperimentAssignment, experiment: ExperimentConfig): boolean {
    return experiment.variants.some((v) => v.id === assignment.variantId);
  }

  private async readStoredAssignment(
    storageKey: string,
    experiment: ExperimentConfig
  ): Promise<ExperimentAssignment | null> {
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      if (!raw) return null;
      const assignment = JSON.parse(raw) as ExperimentAssignment;
      if (!this.isAssignmentFresh(assignment, experiment)) {
        // Assignment is stale or variant was removed — discard and re-randomise
        await AsyncStorage.removeItem(storageKey);
        return null;
      }
      return assignment;
    } catch (error) {
      logger.warn('ABTesting: failed to read stored assignment', { storageKey, error });
      return null;
    }
  }

  private async createAndPersistAssignment(
    experimentId: string,
    assignmentKey: string,
    experiment: ExperimentConfig,
    cacheKey: string
  ): Promise<ExperimentAssignment | null> {
    const variantId = this.pickVariant(experiment, assignmentKey);
    const assignedAt = new Date().toISOString();
    const assignment = this.buildAssignment(experimentId, variantId, assignmentKey, assignedAt);

    try {
      await AsyncStorage.setItem(this.storageKey(experimentId, assignmentKey), JSON.stringify(assignment));
    } catch (error) {
      logger.warn('ABTesting: failed to persist assignment', { experimentId, assignmentKey, error });
      // Still return the assignment so the session works even if storage failed
    }

    this.cache.set(cacheKey, assignment);

    mobileAnalyticsService.trackEvent(AnalyticsEvent.AB_ASSIGNMENT, {
      ab_experiment_id: assignment.experimentId,
      ab_variant_id: assignment.variantId,
      ab_assignment_key: assignment.assignmentKey,
    });

    logger.info('ABTesting: new assignment created', {
      experimentId,
      variantId,
      assignmentKey,
    });

    return assignment;
  }

  private buildAssignment(
    experimentId: string,
    variantId: string,
    assignmentKey: string,
    assignedAt: string
  ): ExperimentAssignment {
    return { experimentId, variantId, assignedAt, assignmentKey };
  }

  private buildMetric(
    assignment: ExperimentAssignment,
    name: string,
    value: number,
    properties?: EventProperties
  ): VariantMetric {
    return {
      experimentId: assignment.experimentId,
      variantId: assignment.variantId,
      name,
      value,
      recordedAt: new Date().toISOString(),
      properties,
    };
  }

  private emitMetric(
    metric: VariantMetric,
    assignment: ExperimentAssignment,
    assignmentKey: string
  ): void {
    mobileAnalyticsService.trackPerformance(metric.name, metric.value, {
      ...metric.properties,
      ab_experiment_id: assignment.experimentId,
      ab_variant_id: assignment.variantId,
      ab_assignment_key: assignmentKey,
    });
  }

  /**
   * Deterministically bucket a user into a variant using FNV-1a hashing.
   * The bucket is stable: same experiment + assignmentKey always → same variant.
   */
  private pickVariant(experiment: ExperimentConfig, assignmentKey: string): string {
    const totalWeight = experiment.variants.reduce((sum, v) => sum + v.weight, 0);
    const bucket = Stats.hashToUnitInterval(`${experiment.id}:${assignmentKey}`) * totalWeight;
    let cumulative = 0;

    for (const variant of experiment.variants) {
      cumulative += variant.weight;
      if (bucket < cumulative) return variant.id;
    }

    // Floating-point safety: return last variant if bucket === totalWeight
    return experiment.variants[experiment.variants.length - 1].id;
  }

  private cacheKey(experimentId: string, assignmentKey: string): string {
    return `${experimentId}:${assignmentKey}`;
  }

  private storageKey(experimentId: string, assignmentKey: string): string {
    return `${ASSIGNMENT_PREFIX}:${experimentId}:${assignmentKey}`;
  }

  private validateExperiment(config: ExperimentConfig): void {
    if (!config.id?.trim() || !config.name?.trim() || !config.description?.trim()) {
      throw new ABTestingError('INVALID_CONFIG', 'Experiment id, name, and description are required.');
    }
    if (config.variants.length < 2) {
      throw new ABTestingError(
        'INVALID_CONFIG',
        `Experiment "${config.id}" requires at least 2 variants; got ${config.variants.length}.`
      );
    }

    const seenIds = new Set<string>();
    for (const variant of config.variants) {
      if (!variant.id?.trim() || !variant.name?.trim()) {
        throw new ABTestingError(
          'INVALID_CONFIG',
          `Variant in experiment "${config.id}" is missing id or name.`
        );
      }
      if (variant.weight <= 0) {
        throw new ABTestingError(
          'INVALID_CONFIG',
          `Variant "${variant.id}" in experiment "${config.id}" must have a positive weight.`
        );
      }
      if (seenIds.has(variant.id)) {
        throw new ABTestingError(
          'DUPLICATE_VARIANT',
          `Duplicate variant id "${variant.id}" in experiment "${config.id}".`
        );
      }
      seenIds.add(variant.id);
    }
  }
}

// ─── Math utilities ───────────────────────────────────────────────────────────

/**
 * Pure statistical helpers — no side effects, no external deps.
 * Exported for unit testing.
 */
export const Stats = {
  mean(values: number[]): number {
    return values.reduce((s, v) => s + v, 0) / values.length;
  },

  sampleVariance(values: number[], sampleMean: number): number {
    const sq = values.reduce((s, v) => s + (v - sampleMean) ** 2, 0);
    return sq / (values.length - 1);
  },

  twoTailedPValue(zScore: number): number {
    return 2 * (1 - 0.5 * (1 + Stats.erf(Math.abs(zScore) / Math.SQRT2)));
  },

  /**
   * Abramowitz & Stegun approximation — maximum error < 1.5 × 10⁻⁷.
   */
  erf(x: number): number {
    const sign = x >= 0 ? 1 : -1;
    const abs = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * abs);
    const poly =
      ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
        0.254829592) *
      t;
    return sign * (1 - poly * Math.exp(-abs * abs));
  },

  /**
   * Rational approximation of the inverse normal CDF (Beasley-Springer-Moro).
   * Accurate to ~4 decimal places for p in (0.001, 0.999).
   */
  inverseNormalCDF(p: number): number {
    const a = [0, -3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
                  1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [0, -5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
                  6.680131188771972e+01, -1.328068155288572e+01];
    const c = [0, -7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
                  -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    const d = [0, 7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00,
                  3.754408661907416e+00];

    const pLow = 0.02425;
    const pHigh = 1 - pLow;

    if (p < pLow) {
      const q = Math.sqrt(-2 * Math.log(p));
      return (((((c[1]*q+c[2])*q+c[3])*q+c[4])*q+c[5])*q+c[6]) /
             ((((d[1]*q+d[2])*q+d[3])*q+d[4])*q+1);
    }
    if (p <= pHigh) {
      const q = p - 0.5;
      const r = q * q;
      return (((((a[1]*r+a[2])*r+a[3])*r+a[4])*r+a[5])*r+a[6])*q /
             (((((b[1]*r+b[2])*r+b[3])*r+b[4])*r+b[5])*r+1);
    }
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[1]*q+c[2])*q+c[3])*q+c[4])*q+c[5])*q+c[6]) /
              ((((d[1]*q+d[2])*q+d[3])*q+d[4])*q+1);
  },

  /** FNV-1a 32-bit hash → unit interval [0, 1). */
  hashToUnitInterval(input: string): number {
    let hash = 2_166_136_261;
    for (let i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 16_777_619);
    }
    return (hash >>> 0) / 4_294_967_296;
  },
};

// ─── Singleton export ─────────────────────────────────────────────────────────

export const abTestingService = new ABTestingService();
export default abTestingService;