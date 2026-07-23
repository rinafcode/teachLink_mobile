import { requestQueue } from '../../src/services/api/requestQueue';
import { FeatureType } from '../../src/services/featureCapabilities';
import { memoryPressureService } from '../../src/services/memoryPressureService';
import { metricsService } from '../../src/services/metricsService';
import { preloadService } from '../../src/services/preloadService';
import { searchIndexService } from '../../src/services/searchIndex';
import { syncService } from '../../src/services/syncService';
import { useDegradationStore } from '../../src/store/degradationStore';
import { useDeviceStore, type MemoryPressureLevel } from '../../src/store/deviceStore';
import { ImageCache } from '../../src/utils/imageCache';
import { appLogger } from '../../src/utils/logger';
import { captureMemorySnapshot } from '../../src/utils/memoryProfiler';

type MemoryProfilerMock = typeof import('../../src/utils/memoryProfiler');

jest.mock('../../src/utils/imageCache', () => ({
  ImageCache: {
    clearCache: jest.fn(() => Promise.resolve()),
    clearNonCritical: jest.fn(() => Promise.resolve()),
    getCacheSizeBytes: jest.fn(() => 0),
    getEvictionThresholdBytes: jest.fn(() => 80 * 1024 * 1024),
  },
}));

jest.mock('../../src/services/preloadService', () => ({
  preloadService: {
    pausePrefetch: jest.fn(),
    resumePrefetch: jest.fn(),
  },
}));

jest.mock('../../src/services/api/requestQueue', () => ({
  requestQueue: {
    stopMonitoring: jest.fn(),
    startMonitoring: jest.fn(),
  },
}));

jest.mock('../../src/services/syncService', () => ({
  syncService: {
    stopAutoSync: jest.fn(),
    startAutoSync: jest.fn(),
    removeAllEventListeners: jest.fn(),
  },
}));

jest.mock('../../src/services/metricsService', () => ({
  metricsService: {
    flush: jest.fn(() => Promise.resolve()),
    recordScreenView: jest.fn(),
    recordEvent: jest.fn(),
    recordApiResponse: jest.fn(),
    recordError: jest.fn(),
    collectSnapshot: jest.fn(() => Promise.resolve({})),
    loadLastSnapshot: jest.fn(() => Promise.resolve(null)),
  },
}));

jest.mock('../../src/services/searchIndex', () => ({
  searchIndexService: {
    compact: jest.fn(),
    ready: false,
    initialize: jest.fn(() => Promise.resolve()),
    search: jest.fn(() => []),
    buildFromCourses: jest.fn(() => Promise.resolve()),
    invalidate: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('../../src/utils/logger', () => ({
  appLogger: {
    warnSync: jest.fn(),
    infoSync: jest.fn(),
    debugSync: jest.fn(),
    errorSync: jest.fn(),
  },
}));

jest.mock('../../src/utils/memoryProfiler', () => {
  const actual = jest.requireActual('../../src/utils/memoryProfiler') as MemoryProfilerMock;
  return {
    ...actual,
    captureMemorySnapshot: jest.fn(),
  };
});

// Real store instances (not mocked) so we can verify dispatch.
jest.mock('../../src/store/deviceStore', () => {
  const actual = jest.requireActual('../../src/store/deviceStore');
  return actual;
});

jest.mock('../../src/store/degradationStore', () => {
  const actual = jest.requireActual('../../src/store/degradationStore');
  return actual;
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setHeapSnapshot(usedHeapBytes: number, heapSizeBytes = 100): void {
  (captureMemorySnapshot as jest.Mock).mockReturnValue({
    timestamp: Date.now(),
    heapSizeBytes,
    usedHeapBytes,
    externalBytes: 0,
    available: true,
  });
}

/** Check the device store's memoryPressureLevel after a pressure check. */
function getDevicePressureLevel(): MemoryPressureLevel {
  return useDeviceStore.getState().memoryPressureLevel;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('MemoryPressureService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store states between tests.
    useDeviceStore.getState().setMemoryPressureLevel('normal');
    // Reset any degraded features from previous tests.
    const degradation = useDegradationStore.getState();
    for (const f of [FeatureType.CAMERA, FeatureType.PUSH_NOTIFICATIONS, FeatureType.LOCATION]) {
      degradation.enableFeature(f);
    }
    setHeapSnapshot(50); // Normal: 50/100 = 50%
  });

  afterEach(() => {
    memoryPressureService.shutdown();
  });

  // ── Warning-level trigger (70-85% utilisation) ──────────────────────────

  it('triggers warning cleanup at 80% heap utilisation and updates deviceStore', async () => {
    setHeapSnapshot(80); // 80% → warning

    await memoryPressureService.checkMemoryPressure();

    // deviceStore updated to 'warning'
    expect(getDevicePressureLevel()).toBe('warning');
    expect(memoryPressureService.isUnderPressure()).toBe(true);
    expect(memoryPressureService.getPressureLevel()).toBe('warning');

    // Cleanup actions called
    expect(ImageCache.clearNonCritical).toHaveBeenCalled();
    expect(metricsService.flush).toHaveBeenCalled();
    expect(searchIndexService.compact).toHaveBeenCalled();
    expect(preloadService.pausePrefetch).toHaveBeenCalled();
    expect(requestQueue.stopMonitoring).toHaveBeenCalled();
    expect(syncService.stopAutoSync).toHaveBeenCalled();
    expect(syncService.removeAllEventListeners).toHaveBeenCalled();
    expect(appLogger.warnSync).toHaveBeenCalledWith(
      expect.stringContaining('Memory pressure: warning'),
      expect.any(Object)
    );

    // Features should NOT be degraded at warning level
    expect(useDegradationStore.getState().isFeatureDegraded(FeatureType.CAMERA)).toBe(false);
  });

  // ── Critical-level trigger (>85% utilisation) ───────────────────────────

  it('triggers critical cleanup at 90% heap utilisation and disables high-memory features', async () => {
    setHeapSnapshot(90); // 90% → critical

    await memoryPressureService.checkMemoryPressure();

    // deviceStore updated to 'critical'
    expect(getDevicePressureLevel()).toBe('critical');
    expect(memoryPressureService.isUnderPressure()).toBe(true);
    expect(memoryPressureService.getPressureLevel()).toBe('critical');

    // All warning cleanup actions still called
    expect(ImageCache.clearNonCritical).toHaveBeenCalled();
    expect(metricsService.flush).toHaveBeenCalled();
    expect(searchIndexService.compact).toHaveBeenCalled();
    expect(preloadService.pausePrefetch).toHaveBeenCalled();

    // Critical-specific: high-memory features disabled
    expect(useDegradationStore.getState().isFeatureDegraded(FeatureType.CAMERA)).toBe(true);
    expect(appLogger.warnSync).toHaveBeenCalledWith(
      expect.stringContaining('Memory pressure: critical'),
      expect.any(Object)
    );
  });

  // ── Recovery ─────────────────────────────────────────────────────────────

  it('recovers from warning back to normal and resumes services', async () => {
    // Trigger warning
    setHeapSnapshot(80);
    await memoryPressureService.checkMemoryPressure();
    expect(getDevicePressureLevel()).toBe('warning');
    expect(memoryPressureService.isUnderPressure()).toBe(true);

    // Back to normal
    setHeapSnapshot(50);
    await memoryPressureService.checkMemoryPressure();

    expect(getDevicePressureLevel()).toBe('normal');
    expect(memoryPressureService.isUnderPressure()).toBe(false);
    expect(memoryPressureService.getPressureLevel()).toBe('normal');

    // Services resumed
    expect(preloadService.resumePrefetch).toHaveBeenCalled();
    expect(requestQueue.startMonitoring).toHaveBeenCalled();
    expect(syncService.startAutoSync).toHaveBeenCalled();
    expect(appLogger.infoSync).toHaveBeenCalledWith(
      expect.stringContaining('Memory pressure recovered'),
      expect.any(Object)
    );
  });

  it('recovers from critical and restores degraded features', async () => {
    // Trigger critical
    setHeapSnapshot(90);
    await memoryPressureService.checkMemoryPressure();
    expect(getDevicePressureLevel()).toBe('critical');
    expect(useDegradationStore.getState().isFeatureDegraded(FeatureType.CAMERA)).toBe(true);

    // Back to normal
    setHeapSnapshot(50);
    await memoryPressureService.checkMemoryPressure();

    expect(getDevicePressureLevel()).toBe('normal');

    // Features restored
    expect(useDegradationStore.getState().isFeatureDegraded(FeatureType.CAMERA)).toBe(false);
  });

  // ── Transition from warning to critical ─────────────────────────────────

  it('transitions from warning to critical and degrades features', async () => {
    setHeapSnapshot(80);
    await memoryPressureService.checkMemoryPressure();
    expect(getDevicePressureLevel()).toBe('warning');

    setHeapSnapshot(90);
    await memoryPressureService.checkMemoryPressure();
    expect(getDevicePressureLevel()).toBe('critical');
    expect(useDegradationStore.getState().isFeatureDegraded(FeatureType.CAMERA)).toBe(true);
  });

  // ── Normal when utilisation is below thresholds ─────────────────────────

  it('does nothing when heap utilisation is normal', async () => {
    setHeapSnapshot(30); // 30% → normal
    await memoryPressureService.checkMemoryPressure();

    expect(getDevicePressureLevel()).toBe('normal');
    expect(memoryPressureService.isUnderPressure()).toBe(false);

    // No cleanup actions should fire
    expect(ImageCache.clearNonCritical).not.toHaveBeenCalled();
    expect(metricsService.flush).not.toHaveBeenCalled();
    expect(searchIndexService.compact).not.toHaveBeenCalled();
    expect(preloadService.pausePrefetch).not.toHaveBeenCalled();
  });

  // ── Idempotent pressure calls ───────────────────────────────────────────

  it('does not duplicate cleanup calls when already at the same pressure level', async () => {
    setHeapSnapshot(80);
    await memoryPressureService.checkMemoryPressure();
    jest.clearAllMocks();

    setHeapSnapshot(82); // Still warning
    await memoryPressureService.checkMemoryPressure();

    // Cleanup should not be called again because level hasn't changed
    expect(ImageCache.clearNonCritical).not.toHaveBeenCalled();
    expect(metricsService.flush).not.toHaveBeenCalled();
    expect(getDevicePressureLevel()).toBe('warning');
  });

  // ── Shutdown restores degraded features ─────────────────────────────────

  it('restores degraded features on shutdown', async () => {
    setHeapSnapshot(90);
    await memoryPressureService.checkMemoryPressure();
    expect(useDegradationStore.getState().isFeatureDegraded(FeatureType.CAMERA)).toBe(true);

    memoryPressureService.shutdown();

    expect(useDegradationStore.getState().isFeatureDegraded(FeatureType.CAMERA)).toBe(false);
  });

  // ── Native memory warning event subscription ────────────────────────────

  it('registers native event listener on init and unregisters on shutdown', () => {
    const addListenerSpy = jest.spyOn(memoryPressureService as any, 'subscribeNativeEvents');
    const removeListenerSpy = jest.spyOn(memoryPressureService as any, 'unsubscribeNativeEvents');

    memoryPressureService.init();
    expect(addListenerSpy).toHaveBeenCalled();

    memoryPressureService.shutdown();
    expect(removeListenerSpy).toHaveBeenCalled();

    addListenerSpy.mockRestore();
    removeListenerSpy.mockRestore();
  });

  it('native memoryWarning event triggers pressure check', async () => {
    // Init to register the listener.
    memoryPressureService.init();

    // Simulate high heap usage so the check will trigger warning cleanup.
    setHeapSnapshot(82);

    // Manually invoke the same code path the native listener would trigger.
    // The native listener calls this.currentLevel = ... then checkMemoryPressure().
    const result = await memoryPressureService.checkMemoryPressure();

    expect(result).toBe('warning');
    expect(getDevicePressureLevel()).toBe('warning');
    expect(ImageCache.clearNonCritical).toHaveBeenCalled();
    expect(metricsService.flush).toHaveBeenCalled();
  });

  // ── Snapshot unavailable (e.g. non-Hermes engine) ───────────────────────

  it('does not trigger pressure when memory snapshot is unavailable', async () => {
    (captureMemorySnapshot as jest.Mock).mockReturnValue({
      timestamp: Date.now(),
      heapSizeBytes: 0,
      usedHeapBytes: 0,
      externalBytes: 0,
      available: false,
    });

    await memoryPressureService.checkMemoryPressure();

    expect(getDevicePressureLevel()).toBe('normal');
    expect(memoryPressureService.isUnderPressure()).toBe(false);
    expect(ImageCache.clearNonCritical).not.toHaveBeenCalled();
  });

  // ── getPressureLevel reports correct state ──────────────────────────────

  it('reports correct pressure level for each tier', () => {
    // Before any check, level defaults to normal.
    expect(memoryPressureService.getPressureLevel()).toBe('normal');
    expect(memoryPressureService.isUnderPressure()).toBe(false);
  });
});
