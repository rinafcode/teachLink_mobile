import {
  captureMemorySnapshot,
  detectLeak,
  formatBytes,
  LEAK_GROWTH_THRESHOLD_BYTES,
  type MemorySnapshot,
} from '../../src/utils/memoryProfiler';

type HermesGlobal = typeof globalThis & {
  HermesInternal?: { getInstrumentedStats?: () => unknown } | null;
};

const hermesGlobal = global as HermesGlobal;

/** Build a snapshot with a specific used-heap value (other fields don't matter). */
function snap(usedHeapBytes: number, timestamp = 0): MemorySnapshot {
  return {
    timestamp,
    heapSizeBytes: usedHeapBytes * 2,
    usedHeapBytes,
    externalBytes: 0,
    available: true,
  };
}

const MB = 1024 * 1024;

describe('captureMemorySnapshot', () => {
  const originalHermes = hermesGlobal.HermesInternal;

  afterEach(() => {
    hermesGlobal.HermesInternal = originalHermes;
  });

  it('returns available: false when HermesInternal is absent', () => {
    hermesGlobal.HermesInternal = undefined;

    const result = captureMemorySnapshot();

    expect(result.available).toBe(false);
    expect(result.heapSizeBytes).toBe(0);
    expect(result.usedHeapBytes).toBe(0);
    expect(result.externalBytes).toBe(0);
    expect(typeof result.timestamp).toBe('number');
  });

  it('returns available: false when getInstrumentedStats is missing', () => {
    hermesGlobal.HermesInternal = {};

    expect(captureMemorySnapshot().available).toBe(false);
  });

  it('reads heap values from instrumented stats when available', () => {
    hermesGlobal.HermesInternal = {
      getInstrumentedStats: () => ({
        hermes_heapSize: 128 * MB,
        hermes_allocatedBytes: 45 * MB,
        hermes_externalBytes: 2 * MB,
      }),
    };

    const result = captureMemorySnapshot();

    expect(result.available).toBe(true);
    expect(result.heapSizeBytes).toBe(128 * MB);
    expect(result.usedHeapBytes).toBe(45 * MB);
    expect(result.externalBytes).toBe(2 * MB);
  });

  it('falls back to legacy hegc_* stat keys', () => {
    hermesGlobal.HermesInternal = {
      getInstrumentedStats: () => ({
        hegc_heap_size: 64 * MB,
        hegc_used_heap_size: 30 * MB,
        hegc_external_memory: 1 * MB,
      }),
    };

    const result = captureMemorySnapshot();

    expect(result.heapSizeBytes).toBe(64 * MB);
    expect(result.usedHeapBytes).toBe(30 * MB);
    expect(result.externalBytes).toBe(1 * MB);
  });
});

describe('detectLeak', () => {
  it('returns false with fewer than 6 snapshots', () => {
    const snapshots = [snap(1 * MB), snap(2 * MB), snap(3 * MB), snap(4 * MB), snap(5 * MB)];
    expect(detectLeak(snapshots)).toBe(false);
  });

  it('returns false when the heap is flat', () => {
    const snapshots = Array.from({ length: 6 }, () => snap(40 * MB));
    expect(detectLeak(snapshots)).toBe(false);
  });

  it('returns false when the heap is declining', () => {
    const snapshots = [60, 55, 50, 45, 40, 35].map(mb => snap(mb * MB));
    expect(detectLeak(snapshots)).toBe(false);
  });

  it('returns false when growth is monotonic but under 10MB', () => {
    // Grows by 1MB per sample => 5MB total over 6 samples, below threshold.
    const snapshots = [40, 41, 42, 43, 44, 45].map(mb => snap(mb * MB));
    expect(detectLeak(snapshots)).toBe(false);
  });

  it('returns false when growth exceeds 10MB but is not strictly monotonic', () => {
    // Big overall growth, but one sample dips => not a sustained leak.
    const snapshots = [10, 30, 25, 40, 50, 60].map(mb => snap(mb * MB));
    expect(detectLeak(snapshots)).toBe(false);
  });

  it('returns true on strictly monotonic growth exceeding 10MB over 6 samples', () => {
    // Grows by 5MB per sample => 25MB total, strictly increasing.
    const snapshots = [40, 45, 50, 55, 60, 65].map(mb => snap(mb * MB));
    expect(detectLeak(snapshots)).toBe(true);
  });

  it('only considers the most recent 6 snapshots', () => {
    // Old samples are a clean leak; the last 6 are flat => no leak now.
    const leaky = [10, 25, 40, 55, 70, 85].map(mb => snap(mb * MB));
    const recentFlat = Array.from({ length: 6 }, () => snap(85 * MB));
    expect(detectLeak([...leaky, ...recentFlat])).toBe(false);
  });

  it('uses exactly the documented 10MB threshold (strictly greater than)', () => {
    // Total growth of exactly 10MB should NOT trip the detector.
    const exactly10 = [0, 2, 4, 6, 8, 10].map(mb =>
      snap(40 * MB + mb * (LEAK_GROWTH_THRESHOLD_BYTES / 10))
    );
    const total = exactly10[5].usedHeapBytes - exactly10[0].usedHeapBytes;
    expect(total).toBe(LEAK_GROWTH_THRESHOLD_BYTES);
    expect(detectLeak(exactly10)).toBe(false);
  });
});

describe('formatBytes', () => {
  it('formats zero and negatives as "0 B"', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(-5)).toBe('0 B');
  });

  it('formats raw bytes without decimals', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('formats kilobytes with one decimal', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('formats megabytes with one decimal', () => {
    expect(formatBytes(1048576)).toBe('1.0 MB');
    expect(formatBytes(47394816)).toBe('45.2 MB');
  });

  it('formats gigabytes with one decimal', () => {
    expect(formatBytes(1024 ** 3)).toBe('1.0 GB');
  });
});
