import { act, renderHook } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as Device from 'expo-device';

import { useMemoryMonitor } from '../../src/hooks/useMemoryMonitor';
import { mobileAnalyticsService } from '../../src/services/mobileAnalytics';
import { captureMemorySnapshot, detectLeak } from '../../src/utils/memoryProfiler';

// Mock logger
jest.mock('../../src/utils/logger', () => {
  const mockInfo = jest.fn();
  const mockWarn = jest.fn();
  const mockError = jest.fn();
  const mockDebug = jest.fn();
  return {
    __esModule: true,
    default: {
      info: mockInfo,
      warn: mockWarn,
      error: mockError,
      debug: mockDebug,
    },
    logger: {
      info: mockInfo,
      warn: mockWarn,
      error: mockError,
      debug: mockDebug,
    },
  };
});

import logger from '../../src/utils/logger';

// Retrieve mocks
const mockLogger = logger as unknown as {
  info: jest.Mock;
  warn: jest.Mock;
  error: jest.Mock;
  debug: jest.Mock;
};

// Mock memory profiler functions
jest.mock('../../src/utils/memoryProfiler', () => {
  const actual = jest.requireActual('../../src/utils/memoryProfiler');
  return {
    ...actual,
    captureMemorySnapshot: jest.fn(),
    detectLeak: jest.fn(),
  };
});

// Mock analytics service
jest.mock('../../src/services/mobileAnalytics', () => ({
  __esModule: true,
  mobileAnalyticsService: {
    trackEvent: jest.fn(),
  },
  default: {
    trackEvent: jest.fn(),
  },
}));

const mockCapture = captureMemorySnapshot as jest.MockedFunction<typeof captureMemorySnapshot>;
const mockDetectLeak = detectLeak as jest.MockedFunction<typeof detectLeak>;
const mockTrackEvent = mobileAnalyticsService.trackEvent as jest.MockedFunction<
  typeof mobileAnalyticsService.trackEvent
>;

const MB = 1024 * 1024;

function createMockSnapshot(usedHeapBytes: number, available = true) {
  return {
    timestamp: Date.now(),
    heapSizeBytes: usedHeapBytes * 1.5,
    usedHeapBytes,
    externalBytes: 0,
    available,
  };
}

describe('useMemoryMonitor', () => {
  let originalGc: typeof global.gc;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    mockCapture.mockReturnValue(createMockSnapshot(40 * MB));
    mockDetectLeak.mockReturnValue(false);

    // Mock global GC
    originalGc = global.gc;
    global.gc = jest.fn();

    // Reset totalMemory to default 4GB
    Object.defineProperty(Device, 'totalMemory', {
      value: 4 * 1024 * 1024 * 1024,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    global.gc = originalGc;
    jest.useRealTimers();
  });

  it('computes isHighMemory and isCriticalMemory based on itemCount', () => {
    // 1. Below warning threshold
    const { result, rerender } = renderHook(
      ({ count }) =>
        useMemoryMonitor({
          componentId: 'TestComponent',
          itemCount: count,
          thresholdWarning: 100,
          thresholdCritical: 500,
        }),
      { initialProps: { count: 50 } }
    );

    expect(result.current.isHighMemory).toBe(false);
    expect(result.current.isCriticalMemory).toBe(false);

    // 2. Above warning threshold, below critical
    rerender({ count: 150 });
    expect(result.current.isHighMemory).toBe(true);
    expect(result.current.isCriticalMemory).toBe(false);

    // 3. Above critical threshold
    rerender({ count: 600 });
    expect(result.current.isHighMemory).toBe(true);
    expect(result.current.isCriticalMemory).toBe(true);
  });

  it('captures initial snapshot and logs on mount', () => {
    const { result } = renderHook(() =>
      useMemoryMonitor({
        componentId: 'TestComponent',
      })
    );

    expect(result.current.heapUsedBytes).toBe(40 * MB);
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('[Memory Monitor] TestComponent Snapshot [Mount]:')
    );
  });

  it('captures snapshots periodically on interval ticks', () => {
    renderHook(() =>
      useMemoryMonitor({
        componentId: 'TestComponent',
      })
    );

    expect(mockLogger.info).toHaveBeenCalledTimes(1); // Mount snapshot

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(mockLogger.info).toHaveBeenCalledTimes(2); // Mount + Interval
    expect(mockLogger.info).toHaveBeenLastCalledWith(
      expect.stringContaining('[Memory Monitor] TestComponent Snapshot [Interval]:')
    );
  });

  it('detects memory leaks, sets isLeakSuspected, warns, and triggers GC/analytics', () => {
    mockDetectLeak.mockReturnValue(true);

    const { result } = renderHook(() =>
      useMemoryMonitor({
        componentId: 'TestComponent',
      })
    );

    // Let the mount effects settle
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.isLeakSuspected).toBe(true);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        '[Memory Monitor] Component TestComponent detected potential memory leak:'
      )
    );
    expect(global.gc).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalledWith(
      'performance_metric',
      expect.objectContaining({
        metric: 'memory_leak_suspected',
        componentId: 'TestComponent',
        usedHeapBytes: 40 * MB,
      })
    );
  });

  it('alerts and triggers GC when memory exceeds 80% of available RAM', () => {
    // Set Device totalMemory to a low value for testing
    Object.defineProperty(Device, 'totalMemory', {
      value: 100 * MB,
      writable: true,
      configurable: true,
    });

    // Make snapshot exceed 80MB (80% of 100MB)
    mockCapture.mockReturnValue(createMockSnapshot(85 * MB));

    const alertSpy = jest.spyOn(Alert, 'alert');

    renderHook(() =>
      useMemoryMonitor({
        componentId: 'TestComponent',
      })
    );

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('[Memory Monitor] TestComponent: APPROACHING DEVICE LIMIT!')
    );
    expect(alertSpy).toHaveBeenCalledWith(
      'Memory Warning',
      expect.stringContaining('TestComponent memory usage is critical:')
    );
    expect(global.gc).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalledWith(
      'performance_metric',
      expect.objectContaining({
        metric: 'high_memory_alert',
        componentId: 'TestComponent',
        usedHeapBytes: 85 * MB,
        totalMemory: 100 * MB,
      })
    );

    alertSpy.mockRestore();
  });

  it('logs final snapshot on unmount', () => {
    const { unmount } = renderHook(() =>
      useMemoryMonitor({
        componentId: 'TestComponent',
      })
    );

    unmount();

    expect(mockLogger.info).toHaveBeenLastCalledWith(
      expect.stringContaining('[Memory Monitor] TestComponent Snapshot [Unmount]:')
    );
  });
});
