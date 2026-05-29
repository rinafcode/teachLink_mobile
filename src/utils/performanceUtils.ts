/**
 * Performance testing utilities for measuring component render times and memory usage.
 * Used to detect performance regressions in heavy components.
 */

export interface PerformanceMetrics {
  renderTime: number; // milliseconds
  memoryUsed: number; // bytes
  timestamp: number;
}

export interface PerformanceBudget {
  maxRenderTime: number; // milliseconds
  maxMemoryIncrease: number; // bytes
  regressionThreshold: number; // percentage (e.g., 10 for 10%)
}

/**
 * Measures component render time using performance.now()
 */
export function measureRenderTime(fn: () => void): number {
  const start = performance.now();
  fn();
  const end = performance.now();
  return end - start;
}

/**
 * Gets current memory usage (Node.js environment)
 */
export function getMemoryUsage(): number {
  if (typeof process !== 'undefined' && (process as any).memoryUsage) {
    return (process as any).memoryUsage().heapUsed;
  }
  return 0;
}

/**
 * Measures render time and memory delta
 */
export function measurePerformance(fn: () => void): PerformanceMetrics {
  const memBefore = getMemoryUsage();
  const renderTime = measureRenderTime(fn);
  const memAfter = getMemoryUsage();

  return {
    renderTime,
    memoryUsed: Math.max(0, memAfter - memBefore),
    timestamp: Date.now(),
  };
}

/**
 * Checks if metrics exceed budget
 */
export function checkPerformanceBudget(
  metrics: PerformanceMetrics,
  budget: PerformanceBudget
): { passed: boolean; violations: string[] } {
  const violations: string[] = [];

  if (metrics.renderTime > budget.maxRenderTime) {
    violations.push(
      `Render time exceeded: ${metrics.renderTime.toFixed(2)}ms > ${budget.maxRenderTime}ms`
    );
  }

  if (metrics.memoryUsed > budget.maxMemoryIncrease) {
    violations.push(
      `Memory increase exceeded: ${(metrics.memoryUsed / 1024 / 1024).toFixed(2)}MB > ${(budget.maxMemoryIncrease / 1024 / 1024).toFixed(2)}MB`
    );
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

/**
 * Detects performance regression by comparing current metrics to baseline
 */
export function detectRegression(
  current: PerformanceMetrics,
  baseline: PerformanceMetrics,
  threshold: number = 10 // percentage
): { isRegression: boolean; percentChange: number; message: string } {
  const percentChange = ((current.renderTime - baseline.renderTime) / baseline.renderTime) * 100;
  const isRegression = percentChange > threshold;

  return {
    isRegression,
    percentChange,
    message: isRegression
      ? `Performance regression detected: ${percentChange.toFixed(2)}% slower than baseline`
      : `Performance is ${Math.abs(percentChange).toFixed(2)}% ${percentChange < 0 ? 'faster' : 'slower'} than baseline`,
  };
}

/**
 * Runs a function multiple times and returns average metrics
 */
export function measureAveragePerformance(
  fn: () => void,
  iterations: number = 5
): PerformanceMetrics {
  const results: PerformanceMetrics[] = [];

  for (let i = 0; i < iterations; i++) {
    results.push(measurePerformance(fn));
  }

  const avgRenderTime = results.reduce((sum, m) => sum + m.renderTime, 0) / iterations;
  const avgMemory = results.reduce((sum, m) => sum + m.memoryUsed, 0) / iterations;

  return {
    renderTime: avgRenderTime,
    memoryUsed: avgMemory,
    timestamp: Date.now(),
  };
}
