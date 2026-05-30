import { act, renderHook } from '@testing-library/react-native';

import { useMemoryProfiler } from '../../hooks/useMemoryProfiler';
import { appLogger } from '../../src/utils/logger';
import { captureMemorySnapshot, type MemorySnapshot } from '../../src/utils/memoryProfiler';

// Mock the logger so we can assert on leak warnings without real I/O.
jest.mock('../../src/utils/logger', () => ({
  appLogger: {
    warnSync: jest.fn(),
    infoSync: jest.fn(),
  },
}));

// Mock only captureMemorySnapshot; keep the real detectLeak/formatBytes so the
// hook's leak logic is exercised end-to-end.
jest.mock('../../src/utils/memoryProfiler', () => {
  const actual = jest.requireActual('../../src/utils/memoryProfiler');
  return {
    ...actual,
    captureMemorySnapshot: jest.fn(),
  };
});

const mockCapture = captureMemorySnapshot as jest.MockedFunction<typeof captureMemorySnapshot>;
const mockWarnSync = appLogger.warnSync as jest.MockedFunction<typeof appLogger.warnSync>;

const MB = 1024 * 1024;

function snap(usedHeapBytes: number, available = true): MemorySnapshot {
  return {
    timestamp: 0,
    heapSizeBytes: usedHeapBytes * 2,
    usedHeapBytes,
    externalBytes: 0,
    available,
  };
}

describe('useMemoryProfiler', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockCapture.mockReset();
    mockWarnSync.mockReset();
    // A stable default reading; individual tests override as needed.
    mockCapture.mockReturnValue(snap(40 * MB));
    (global as { __DEV__?: boolean }).__DEV__ = true;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('captures a snapshot on each interval tick', () => {
    const { result } = renderHook(() => useMemoryProfiler({ intervalMs: 1000 }));

    expect(result.current.snapshots).toHaveLength(0);

    act(() => jest.advanceTimersByTime(1000));
    expect(result.current.snapshots).toHaveLength(1);

    act(() => jest.advanceTimersByTime(2000));
    expect(result.current.snapshots).toHaveLength(3);
    expect(result.current.latest?.usedHeapBytes).toBe(40 * MB);
  });

  it('caps the snapshot array at maxSnapshots, dropping the oldest', () => {
    let used = 0;
    mockCapture.mockImplementation(() => {
      used += 1;
      return snap(used * MB);
    });

    const { result } = renderHook(() => useMemoryProfiler({ intervalMs: 1000, maxSnapshots: 3 }));

    act(() => jest.advanceTimersByTime(5000)); // 5 ticks, cap is 3

    expect(result.current.snapshots).toHaveLength(3);
    // Oldest dropped: should hold samples 3, 4, 5.
    expect(result.current.snapshots.map(s => s.usedHeapBytes)).toEqual([3 * MB, 4 * MB, 5 * MB]);
  });

  it('clearSnapshots empties the array', () => {
    const { result } = renderHook(() => useMemoryProfiler({ intervalMs: 1000 }));

    act(() => jest.advanceTimersByTime(3000));
    expect(result.current.snapshots.length).toBeGreaterThan(0);

    act(() => result.current.clearSnapshots());
    expect(result.current.snapshots).toHaveLength(0);
    expect(result.current.latest).toBeNull();
    expect(result.current.isLeakSuspected).toBe(false);
  });

  it('pause stops new captures; resume restarts them', () => {
    const { result } = renderHook(() => useMemoryProfiler({ intervalMs: 1000 }));

    act(() => jest.advanceTimersByTime(2000));
    const countAfterTwo = result.current.snapshots.length;
    expect(countAfterTwo).toBe(2);

    act(() => result.current.pause());
    act(() => jest.advanceTimersByTime(3000));
    expect(result.current.snapshots).toHaveLength(countAfterTwo);
    expect(result.current.isPaused).toBe(true);

    act(() => result.current.resume());
    act(() => jest.advanceTimersByTime(1000));
    expect(result.current.snapshots).toHaveLength(countAfterTwo + 1);
    expect(result.current.isPaused).toBe(false);
  });

  it('does not capture while disabled (and never starts the interval)', () => {
    const { result } = renderHook(() => useMemoryProfiler({ intervalMs: 1000, enabled: false }));

    act(() => jest.advanceTimersByTime(5000));
    expect(result.current.snapshots).toHaveLength(0);
    expect(mockCapture).not.toHaveBeenCalled();
  });

  it('clears its interval on unmount', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    const { unmount } = renderHook(() => useMemoryProfiler({ intervalMs: 1000 }));
    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it('flags isLeakSuspected and warns once when sustained growth is detected', () => {
    let step = 0;
    mockCapture.mockImplementation(() => {
      // Strictly increasing by 5MB per tick => >10MB growth over 6 samples.
      step += 1;
      return snap(40 * MB + step * 5 * MB);
    });

    const { result } = renderHook(() => useMemoryProfiler({ intervalMs: 1000 }));

    // Five ticks: not yet enough for a 6-sample window.
    act(() => jest.advanceTimersByTime(5000));
    expect(result.current.isLeakSuspected).toBe(false);
    expect(mockWarnSync).not.toHaveBeenCalled();

    // Sixth tick completes the window and trips the detector.
    act(() => jest.advanceTimersByTime(1000));
    expect(result.current.isLeakSuspected).toBe(true);
    expect(mockWarnSync).toHaveBeenCalledTimes(1);
    expect(mockWarnSync).toHaveBeenCalledWith(
      'Potential memory leak detected',
      expect.objectContaining({ snapshotCount: expect.any(Number) })
    );

    // Further growth keeps the flag but must NOT re-warn.
    act(() => jest.advanceTimersByTime(2000));
    expect(mockWarnSync).toHaveBeenCalledTimes(1);
  });

  it('reports availability from the captured snapshot', () => {
    mockCapture.mockReturnValue(snap(0, false));

    const { result } = renderHook(() => useMemoryProfiler({ intervalMs: 1000 }));
    act(() => jest.advanceTimersByTime(1000));

    expect(result.current.isAvailable).toBe(false);
  });
});
