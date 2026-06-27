/**
 * Differential Privacy Engine
 *
 * Implements the Laplace mechanism for ε-differential privacy.
 * Adds calibrated noise to numeric metrics so individual user events
 * cannot be distinguished from aggregated data, while preserving
 * statistical accuracy at the population level.
 *
 * Privacy budget (ε): smaller ε → stronger privacy, more noise.
 * Recommended: ε = 1.0 (strong), ε = 0.1 (very strong).
 */

export interface DPConfig {
  /** Privacy budget (epsilon). Lower = more private. Default: 1.0 */
  epsilon: number;
  /** Sensitivity: maximum change one user can cause. Default: 1.0 */
  sensitivity: number;
  /** Whether DP is enabled. Can be disabled for debugging. Default: true */
  enabled: boolean;
}

export const DEFAULT_DP_CONFIG: DPConfig = {
  epsilon: 1.0,
  sensitivity: 1.0,
  enabled: true,
};

/**
 * Sample from the Laplace distribution using the inverse CDF method.
 * Laplace(0, b) where b = sensitivity / epsilon.
 */
function laplaceSample(scale: number): number {
  // Uniform sample in (-0.5, 0.5) excluding 0
  let u = Math.random() - 0.5;
  while (u === 0) u = Math.random() - 0.5;
  return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
}

/**
 * Add Laplace noise to a numeric value for ε-DP.
 *
 * @param value - The true numeric value
 * @param config - DP configuration
 * @returns Noisy value
 */
export function addLaplaceNoise(value: number, config: Partial<DPConfig> = {}): number {
  const cfg = { ...DEFAULT_DP_CONFIG, ...config };
  if (!cfg.enabled) return value;

  const scale = cfg.sensitivity / cfg.epsilon;
  return value + laplaceSample(scale);
}

/**
 * Clip a value to [min, max] to bound sensitivity before adding noise.
 * Clipping is essential: it ensures the sensitivity parameter is valid.
 */
export function clip(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Apply DP to a count (e.g., number of events).
 * Clips to [0, maxCount] then adds Laplace noise.
 * Returns a rounded non-negative integer.
 */
export function privatizeCount(
  count: number,
  maxCount: number = 1000,
  config: Partial<DPConfig> = {}
): number {
  const clipped = clip(count, 0, maxCount);
  const noisy = addLaplaceNoise(clipped, config);
  return Math.max(0, Math.round(noisy));
}

/**
 * Apply DP to a duration/timing metric in milliseconds.
 * Clips to [0, maxMs] then adds noise. Returns non-negative value.
 */
export function privatizeDuration(
  durationMs: number,
  maxMs: number = 300_000, // 5 minutes
  config: Partial<DPConfig> = {}
): number {
  const clipped = clip(durationMs, 0, maxMs);
  const noisy = addLaplaceNoise(clipped, { sensitivity: maxMs / 1000, ...config });
  return Math.max(0, noisy);
}

/**
 * Aggregate numeric values privately using the Laplace mechanism.
 * Computes the true sum, clips to [0, maxSum], then adds noise.
 */
export function privateSum(
  values: number[],
  maxPerValue: number = 1,
  config: Partial<DPConfig> = {}
): number {
  const clippedSum = values.reduce((acc, v) => acc + clip(v, 0, maxPerValue), 0);
  const noisy = addLaplaceNoise(clippedSum, {
    sensitivity: maxPerValue,
    ...config,
  });
  return Math.max(0, noisy);
}

/**
 * Sanitize string event properties to remove PII.
 * Strips email addresses, phone numbers, and UUIDs.
 */
export function sanitizeProperties(properties: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(properties)) {
    if (typeof value === 'string') {
      result[key] = value
        .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[id]')
        .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email]')
        .replace(/\+?[\d\s\-().]{7,}/g, '[phone]');
    } else if (typeof value === 'number') {
      result[key] = value;
    } else if (typeof value === 'boolean') {
      result[key] = value;
    }
    // Drop objects/arrays that could contain PII
  }

  return result;
}

/**
 * Compute a noisy histogram from a list of categorical values.
 * Each bin gets Laplace noise added independently.
 */
export function privateHistogram(
  values: string[],
  config: Partial<DPConfig> = {}
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const v of values) {
    counts[v] = (counts[v] ?? 0) + 1;
  }

  const result: Record<string, number> = {};
  for (const [bin, count] of Object.entries(counts)) {
    result[bin] = Math.max(0, Math.round(addLaplaceNoise(count, { sensitivity: 1, ...config })));
  }

  return result;
}
