import { requestQueue } from '../../src/services/api/requestQueue';
import { memoryPressureService } from '../../src/services/memoryPressureService';
import { preloadService } from '../../src/services/preloadService';
import { syncService } from '../../src/services/syncService';
import { ImageCache } from '../../src/utils/imageCache';
import { appLogger } from '../../src/utils/logger';
import { captureMemorySnapshot } from '../../src/utils/memoryProfiler';

type MemoryProfilerMock = typeof import('../../src/utils/memoryProfiler');

jest.mock('../../src/utils/imageCache', () => ({
  ImageCache: {
    clearCache: jest.fn(() => Promise.resolve()),
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

jest.mock('../../src/utils/logger', () => ({
  appLogger: {
    warnSync: jest.fn(),
    infoSync: jest.fn(),
  },
}));

jest.mock('../../src/utils/memoryProfiler', () => {
  const actual = jest.requireActual('../../src/utils/memoryProfiler') as MemoryProfilerMock;
  return {
    ...actual,
    captureMemorySnapshot: jest.fn(),
  };
});

describe('MemoryPressureService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (captureMemorySnapshot as jest.Mock).mockReturnValue({
      timestamp: Date.now(),
      heapSizeBytes: 100,
      usedHeapBytes: 80,
      externalBytes: 0,
      available: true,
    });
  });

  afterEach(() => {
    memoryPressureService.shutdown();
  });

  it('triggers cleanup when heap utilization exceeds 70%', async () => {
    await memoryPressureService.checkMemoryPressure();

    expect(ImageCache.clearCache).toHaveBeenCalled();
    expect(preloadService.pausePrefetch).toHaveBeenCalled();
    expect(requestQueue.stopMonitoring).toHaveBeenCalled();
    expect(syncService.stopAutoSync).toHaveBeenCalled();
    expect(syncService.removeAllEventListeners).toHaveBeenCalled();
    expect(appLogger.warnSync).toHaveBeenCalledWith(expect.stringContaining('High memory pressure detected'), expect.any(Object));
  });

  it('resumes paused work after memory pressure subsides', async () => {
    await memoryPressureService.checkMemoryPressure();
    expect(memoryPressureService.isUnderPressure()).toBe(true);

    (captureMemorySnapshot as jest.Mock).mockReturnValue({
      timestamp: Date.now(),
      heapSizeBytes: 100,
      usedHeapBytes: 50,
      externalBytes: 0,
      available: true,
    });

    await memoryPressureService.checkMemoryPressure();

    expect(memoryPressureService.isUnderPressure()).toBe(false);
    expect(preloadService.resumePrefetch).toHaveBeenCalled();
    expect(requestQueue.startMonitoring).toHaveBeenCalled();
    expect(syncService.startAutoSync).toHaveBeenCalled();
    expect(appLogger.infoSync).toHaveBeenCalledWith(expect.stringContaining('Memory pressure recovered'), expect.any(Object));
  });
});
