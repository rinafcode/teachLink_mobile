import AsyncStorage from '@react-native-async-storage/async-storage';

import { mobileAnalyticsService } from './mobileAnalytics';
import { logger } from '../utils/logger';
import { AnalyticsEvent, EventProperties } from '../utils/trackingEvents';

const ASSIGNMENT_STORAGE_PREFIX = '@teachlink_ab_assignment';
const DEFAULT_ALPHA = 0.05;

export interface ExperimentVariant {
  id: string;
  name: string;
  weight: number;
  description?: string;
}

export interface ExperimentConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  variants: ExperimentVariant[];
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
  pValue: number;
  isSignificant: boolean;
  confidenceLevel: number;
}

export interface ConversionSignificanceResult {
  controlRate: number;
  variantRate: number;
  absoluteDifference: number;
  relativeDifference: number;
  pValue: number;
  isSignificant: boolean;
  confidenceLevel: number;
}

class ABTestingService {
  private experiments = new Map<string, ExperimentConfig>();

  public registerExperiment(config: ExperimentConfig): void {
    this.validateExperiment(config);
    this.experiments.set(config.id, config);
  }

  public registerExperiments(configs: ExperimentConfig[]): void {
    configs.forEach(config => this.registerExperiment(config));
  }

  public getExperiment(experimentId: string): ExperimentConfig | undefined {
    return this.experiments.get(experimentId);
  }

  public async getAssignment(
    experimentId: string,
    assignmentKey: string = 'anonymous'
  ): Promise<ExperimentAssignment | null> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment || !experiment.enabled) {
      return null;
    }

    const storageKey = this.getStorageKey(experimentId, assignmentKey);
    const existing = await this.getStoredAssignment(storageKey, experiment);
    if (existing) {
      return existing;
    }

    const assignment: ExperimentAssignment = {
      experimentId,
      variantId: this.pickVariant(experiment, assignmentKey),
      assignedAt: new Date().toISOString(),
      assignmentKey,
    };

    await AsyncStorage.setItem(storageKey, JSON.stringify(assignment));
    mobileAnalyticsService.trackEvent(AnalyticsEvent.AB_ASSIGNMENT, {
      ab_experiment_id: assignment.experimentId,
      ab_variant_id: assignment.variantId,
      ab_assignment_key: assignment.assignmentKey,
    });

    return assignment;
  }

  public async trackExposure(
    experimentId: string,
    assignmentKey: string = 'anonymous',
    properties?: EventProperties
  ): Promise<ExperimentAssignment | null> {
    const assignment = await this.getAssignment(experimentId, assignmentKey);
    if (!assignment) {
      return null;
    }

    mobileAnalyticsService.trackEvent(AnalyticsEvent.AB_EXPOSURE, {
      ...properties,
      ab_experiment_id: assignment.experimentId,
      ab_variant_id: assignment.variantId,
      ab_assignment_key: assignment.assignmentKey,
    });

    return assignment;
  }

  public async trackMetric(
    experimentId: string,
    name: string,
    value: number,
    assignmentKey: string = 'anonymous',
    properties?: EventProperties
  ): Promise<VariantMetric | null> {
    const assignment = await this.getAssignment(experimentId, assignmentKey);
    if (!assignment) {
      return null;
    }

    const metric: VariantMetric = {
      experimentId,
      variantId: assignment.variantId,
      name,
      value,
      recordedAt: new Date().toISOString(),
      properties,
    };

    mobileAnalyticsService.trackPerformance(name, value, {
      ...properties,
      ab_experiment_id: assignment.experimentId,
      ab_variant_id: assignment.variantId,
      ab_assignment_key: assignment.assignmentKey,
    });

    return metric;
  }

  public calculateMetricSignificance(
    controlSamples: number[],
    variantSamples: number[],
    alpha: number = DEFAULT_ALPHA
  ): SignificanceResult {
    if (controlSamples.length < 2 || variantSamples.length < 2) {
      throw new Error('At least two samples are required for each variant.');
    }

    const controlMean = mean(controlSamples);
    const variantMean = mean(variantSamples);
    const controlVariance = sampleVariance(controlSamples, controlMean);
    const variantVariance = sampleVariance(variantSamples, variantMean);
    const standardError = Math.sqrt(
      controlVariance / controlSamples.length + variantVariance / variantSamples.length
    );
    const zScore = standardError === 0 ? 0 : (variantMean - controlMean) / standardError;
    const pValue = twoTailedPValue(zScore);

    return {
      controlMean,
      variantMean,
      absoluteDifference: variantMean - controlMean,
      relativeDifference: controlMean === 0 ? 0 : (variantMean - controlMean) / controlMean,
      pValue,
      isSignificant: pValue < alpha,
      confidenceLevel: 1 - alpha,
    };
  }

  public calculateConversionSignificance(
    controlConversions: number,
    controlTotal: number,
    variantConversions: number,
    variantTotal: number,
    alpha: number = DEFAULT_ALPHA
  ): ConversionSignificanceResult {
    if (controlTotal <= 0 || variantTotal <= 0) {
      throw new Error('Conversion totals must be greater than zero.');
    }

    const controlRate = controlConversions / controlTotal;
    const variantRate = variantConversions / variantTotal;
    const pooledRate = (controlConversions + variantConversions) / (controlTotal + variantTotal);
    const standardError = Math.sqrt(
      pooledRate * (1 - pooledRate) * (1 / controlTotal + 1 / variantTotal)
    );
    const zScore = standardError === 0 ? 0 : (variantRate - controlRate) / standardError;
    const pValue = twoTailedPValue(zScore);

    return {
      controlRate,
      variantRate,
      absoluteDifference: variantRate - controlRate,
      relativeDifference: controlRate === 0 ? 0 : (variantRate - controlRate) / controlRate,
      pValue,
      isSignificant: pValue < alpha,
      confidenceLevel: 1 - alpha,
    };
  }

  private async getStoredAssignment(
    storageKey: string,
    experiment: ExperimentConfig
  ): Promise<ExperimentAssignment | null> {
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      if (!raw) {
        return null;
      }

      const assignment = JSON.parse(raw) as ExperimentAssignment;
      const stillValid = experiment.variants.some(variant => variant.id === assignment.variantId);
      return stillValid ? assignment : null;
    } catch (error) {
      logger.warn('ABTesting: Failed to read stored assignment', error);
      return null;
    }
  }

  private pickVariant(experiment: ExperimentConfig, assignmentKey: string): string {
    const totalWeight = experiment.variants.reduce((sum, variant) => sum + variant.weight, 0);
    const bucket = hashToUnitInterval(`${experiment.id}:${assignmentKey}`) * totalWeight;
    let cumulative = 0;

    for (const variant of experiment.variants) {
      cumulative += variant.weight;
      if (bucket < cumulative) {
        return variant.id;
      }
    }

    return experiment.variants[experiment.variants.length - 1].id;
  }

  private getStorageKey(experimentId: string, assignmentKey: string): string {
    return `${ASSIGNMENT_STORAGE_PREFIX}:${experimentId}:${assignmentKey}`;
  }

  private validateExperiment(config: ExperimentConfig): void {
    if (!config.id || !config.name || !config.description) {
      throw new Error('Experiment id, name, and description are required.');
    }

    if (config.variants.length < 2) {
      throw new Error('Experiments require at least two variants.');
    }

    const ids = new Set<string>();
    config.variants.forEach(variant => {
      if (!variant.id || !variant.name || variant.weight <= 0) {
        throw new Error('Variant id, name, and positive weight are required.');
      }

      if (ids.has(variant.id)) {
        throw new Error(`Duplicate variant id: ${variant.id}`);
      }

      ids.add(variant.id);
    });
  }
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sampleVariance(values: number[], sampleMean: number): number {
  const squaredDiffs = values.reduce((sum, value) => sum + (value - sampleMean) ** 2, 0);
  return squaredDiffs / (values.length - 1);
}

function twoTailedPValue(zScore: number): number {
  const probability = 0.5 * (1 + erf(Math.abs(zScore) / Math.SQRT2));
  return 2 * (1 - probability);
}

function erf(value: number): number {
  const sign = value >= 0 ? 1 : -1;
  const x = Math.abs(value);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * x);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
}

function hashToUnitInterval(input: string): number {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967296;
}

export const abTestingService = new ABTestingService();
export default abTestingService;
