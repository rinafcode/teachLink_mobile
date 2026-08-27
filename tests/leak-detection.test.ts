/**
 * leak-detection.test.ts
 *
 * Verifies that services with module-scope timers, listeners, or intervals
 * expose teardown functions and that calling them does not throw.
 *
 * This test does NOT verify zero open handles (that's --detectOpenHandles' job).
 * It verifies the teardown convention exists and is safe to call.
 */

describe('Service teardown convention', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const axiosConfig = require('../src/services/api/axios.config');

  it('axios.config exports stopCacheStatsFlush', () => {
    expect(typeof axiosConfig.stopCacheStatsFlush).toBe('function');
    // Should be safe to call even when not started
    expect(() => axiosConfig.stopCacheStatsFlush()).not.toThrow();
  });

  it('axios.config exports flushCacheStatsNow', () => {
    expect(typeof axiosConfig.flushCacheStatsNow).toBe('function');
  });

  it('memoryPressureService exposes shutdown', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { memoryPressureService } = require('../src/services/memoryPressureService');
    expect(typeof memoryPressureService.shutdown).toBe('function');
    // Should be safe to call even when not initialised
    expect(() => memoryPressureService.shutdown()).not.toThrow();
  });

  it('networkMonitor exposes destroy', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { networkMonitor } = require('../src/services/networkMonitor');
    expect(typeof networkMonitor.destroy).toBe('function');
    // Should be safe to call even when not initialised
    expect(() => networkMonitor.destroy()).not.toThrow();
  });

  it('backgroundScheduler has expected API', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { backgroundScheduler } = require('../src/services/backgroundTaskScheduler');
    expect(typeof backgroundScheduler.runAfterUI).toBe('function');
    expect(typeof backgroundScheduler.enqueueLowPriorityTask).toBe('function');
  });
});
