/**
 * Differential Privacy utilities for analytics data.
 *
 * Implements the Laplace and Gaussian mechanisms to add calibrated noise
 * to numeric values before they are sent to analytics backends, providing
 * (ε, δ)-differential privacy guarantees.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PrivacyConfig {
  /** Privacy budget (epsilon). Smaller = more private. Typical range: 0.1–10. */
  epsilon: number;
  /** Delta for Gaussian mechanism (probability of privacy breach). Typical: 1e-5. */
  delta?: number;
  /** Sensitivity: max change a single user can cause in the output. */
  sensitivity?: number;
}

export type NoiseType = 'laplace' | 'gaussian';

// ─── Core Noise Mechanisms ────────────────────────────────────────────────────

/**
 * Sample from a Laplace distribution with mean 0 and scale b.
 * Uses the inverse CDF method: X = -b * sign(U) * ln(1 - 2|U|)
 */
function sampleLaplace(scale: number): number {
  // Uniform in (-0.5, 0.5) to avoid log(0)
  const u = Math.random() - 0.5;
  return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
}

/**
 * Sample from a standard normal distribution using the Box-Muller transform.
 */
function sampleGaussian(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Add Laplace noise to a numeric value.
 * Provides ε-differential privacy with sensitivity / epsilon as the scale.
 *
 * @param value     The true numeric value.
 * @param epsilon   Privacy budget (ε > 0).
 * @param sensitivity  L1 sensitivity of the query (default 1).
 * @returns The noisy value.
 */
export function addLaplaceNoise(value: number, epsilon: number, sensitivity = 1): number {
  if (epsilon <= 0) throw new Error('epsilon must be positive');
  const scale = sensitivity / epsilon;
  return value + sampleLaplace(scale);
}

/**
 * Add Gaussian noise to a numeric value.
 * Provides (ε, δ)-differential privacy.
 *
 * @param value       The true numeric value.
 * @param epsilon     Privacy budget (ε > 0).
 * @param delta       Failure probability (0 < δ < 1, default 1e-5).
 * @param sensitivity L2 sensitivity of the query (default 1).
 * @returns The noisy value.
 */
export function addGaussianNoise(
  value: number,
  epsilon: number,
  delta = 1e-5,
  sensitivity = 1
): number {
  if (epsilon <= 0) throw new Error('epsilon must be positive');
  if (delta <= 0 || delta >= 1) throw new Error('delta must be in (0, 1)');
  // σ = sensitivity * sqrt(2 * ln(1.25/δ)) / ε
  const sigma = (sensitivity * Math.sqrt(2 * Math.log(1.25 / delta))) / epsilon;
  return value + sampleGaussian() * sigma;
}

/**
 * Apply differential privacy noise to a numeric value using the specified mechanism.
 */
export function applyNoise(
  value: number,
  config: PrivacyConfig,
  type: NoiseType = 'laplace'
): number {
  const { epsilon, delta = 1e-5, sensitivity = 1 } = config;
  return type === 'gaussian'
    ? addGaussianNoise(value, epsilon, delta, sensitivity)
    : addLaplaceNoise(value, epsilon, sensitivity);
}

/**
 * Randomized response for boolean values.
 * With probability p = e^ε / (1 + e^ε), report the true value; otherwise flip it.
 * Provides ε-local differential privacy.
 */
export function randomizedResponse(value: boolean, epsilon: number): boolean {
  if (epsilon <= 0) throw new Error('epsilon must be positive');
  const p = Math.exp(epsilon) / (1 + Math.exp(epsilon));
  return Math.random() < p ? value : !value;
}

/**
 * Sanitize an EventProperties object by adding noise to numeric fields
 * and applying randomized response to boolean fields.
 *
 * String fields are passed through unchanged (they are not numeric queries).
 */
export function sanitizeEventProperties(
  properties: Record<string, string | number | boolean | null | undefined>,
  config: PrivacyConfig,
  noiseType: NoiseType = 'laplace'
): Record<string, string | number | boolean | null | undefined> {
  const result: Record<string, string | number | boolean | null | undefined> = {};

  for (const [key, value] of Object.entries(properties)) {
    if (typeof value === 'number') {
      result[key] = applyNoise(value, config, noiseType);
    } else if (typeof value === 'boolean') {
      result[key] = randomizedResponse(value, config.epsilon);
    } else {
      result[key] = value;
    }
  }

  return result;
}
