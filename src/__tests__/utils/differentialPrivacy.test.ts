import {
  DEFAULT_DP_CONFIG,
  addLaplaceNoise,
  clip,
  privatizeCount,
  privatizeDuration,
  privateHistogram,
  privateSum,
  sanitizeProperties,
} from '../../utils/differentialPrivacy';

// ─── addLaplaceNoise ──────────────────────────────────────────────────────────

describe('addLaplaceNoise', () => {
  it('returns the original value when DP is disabled', () => {
    const value = 42;
    const result = addLaplaceNoise(value, { enabled: false });
    expect(result).toBe(42);
  });

  it('returns a different value when DP is enabled', () => {
    // With very small epsilon, noise is large — almost certainly changes the value
    const value = 100;
    let differentCount = 0;
    for (let i = 0; i < 20; i++) {
      if (addLaplaceNoise(value, { epsilon: 0.01 }) !== value) differentCount++;
    }
    expect(differentCount).toBeGreaterThan(0);
  });

  it('statistical mean is close to the true value (unbiasedness)', () => {
    const value = 50;
    const samples = 10_000;
    const sum = Array.from({ length: samples }, () =>
      addLaplaceNoise(value, { epsilon: 1.0, sensitivity: 1.0 })
    ).reduce((a, b) => a + b, 0);
    const mean = sum / samples;
    // Laplace is zero-mean; mean should be within 1 of true value at 10k samples
    expect(Math.abs(mean - value)).toBeLessThan(1);
  });

  it('larger epsilon produces less noise (tighter distribution)', () => {
    const value = 0;
    const variance = (epsilon: number) => {
      const samples = 5_000;
      const vals = Array.from({ length: samples }, () =>
        addLaplaceNoise(value, { epsilon, sensitivity: 1.0 })
      );
      const mean = vals.reduce((a, b) => a + b, 0) / samples;
      return vals.reduce((a, b) => a + (b - mean) ** 2, 0) / samples;
    };
    expect(variance(10)).toBeLessThan(variance(0.1));
  });

  it('uses DEFAULT_DP_CONFIG when no config provided', () => {
    const value = 0;
    // Should not throw
    expect(() => addLaplaceNoise(value)).not.toThrow();
  });
});

// ─── clip ─────────────────────────────────────────────────────────────────────

describe('clip', () => {
  it('clamps value below min to min', () => {
    expect(clip(-5, 0, 100)).toBe(0);
  });

  it('clamps value above max to max', () => {
    expect(clip(200, 0, 100)).toBe(100);
  });

  it('leaves value within range unchanged', () => {
    expect(clip(50, 0, 100)).toBe(50);
  });

  it('handles value equal to bounds', () => {
    expect(clip(0, 0, 100)).toBe(0);
    expect(clip(100, 0, 100)).toBe(100);
  });
});

// ─── privatizeCount ──────────────────────────────────────────────────────────

describe('privatizeCount', () => {
  it('returns a non-negative integer', () => {
    for (let i = 0; i < 50; i++) {
      const result = privatizeCount(5, 1000);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(result)).toBe(true);
    }
  });

  it('clips input above maxCount before noising', () => {
    // Input far above max should still produce finite output
    const result = privatizeCount(1_000_000, 10);
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('passes through original value when DP is disabled', () => {
    // With DP disabled, no noise — result = round(clip(5, 0, 1000)) = 5
    expect(privatizeCount(5, 1000, { ...DEFAULT_DP_CONFIG, enabled: false })).toBe(5);
  });

  it('statistical mean is close to true count', () => {
    const trueCount = 100;
    const samples = 2_000;
    const mean =
      Array.from({ length: samples }, () => privatizeCount(trueCount, 1000)).reduce(
        (a, b) => a + b,
        0
      ) / samples;
    expect(Math.abs(mean - trueCount)).toBeLessThan(5);
  });
});

// ─── privatizeDuration ───────────────────────────────────────────────────────

describe('privatizeDuration', () => {
  it('returns a non-negative value', () => {
    for (let i = 0; i < 50; i++) {
      expect(privatizeDuration(1000)).toBeGreaterThanOrEqual(0);
    }
  });

  it('clips negative durations to 0', () => {
    for (let i = 0; i < 20; i++) {
      const result = privatizeDuration(-9999);
      expect(result).toBeGreaterThanOrEqual(0);
    }
  });

  it('passes through when disabled', () => {
    const result = privatizeDuration(500, 300_000, { ...DEFAULT_DP_CONFIG, enabled: false });
    expect(result).toBe(500);
  });
});

// ─── privateSum ──────────────────────────────────────────────────────────────

describe('privateSum', () => {
  it('returns a non-negative value', () => {
    for (let i = 0; i < 30; i++) {
      expect(privateSum([1, 1, 1, 1, 1])).toBeGreaterThanOrEqual(0);
    }
  });

  it('handles an empty array', () => {
    for (let i = 0; i < 10; i++) {
      expect(privateSum([])).toBeGreaterThanOrEqual(0);
    }
  });

  it('clips each value to maxPerValue before summing', () => {
    // All values above maxPerValue=1 are clipped to 1
    // True sum = 5, noisy but finite
    const result = privateSum([100, 100, 100, 100, 100], 1, {
      ...DEFAULT_DP_CONFIG,
      enabled: false,
    });
    expect(result).toBe(5);
  });
});

// ─── sanitizeProperties ──────────────────────────────────────────────────────

describe('sanitizeProperties', () => {
  it('redacts email addresses', () => {
    const result = sanitizeProperties({ email: 'user@example.com', name: 'Alice' });
    expect(result.email).toBe('[email]');
    expect(result.name).toBe('Alice');
  });

  it('redacts UUID-like strings', () => {
    const result = sanitizeProperties({ id: '550e8400-e29b-41d4-a716-446655440000' });
    expect(result.id).toBe('[id]');
  });

  it('preserves numbers and booleans', () => {
    const result = sanitizeProperties({ count: 42, active: true });
    expect(result.count).toBe(42);
    expect(result.active).toBe(true);
  });

  it('drops nested objects to prevent PII leakage', () => {
    const result = sanitizeProperties({ nested: { secret: 'pii' } });
    expect(result.nested).toBeUndefined();
  });

  it('handles empty object', () => {
    expect(sanitizeProperties({})).toEqual({});
  });

  it('strips phone numbers', () => {
    const result = sanitizeProperties({ phone: '+1-800-555-1234' });
    expect(result.phone).toBe('[phone]');
  });
});

// ─── privateHistogram ────────────────────────────────────────────────────────

describe('privateHistogram', () => {
  it('returns non-negative bin counts', () => {
    const values = ['a', 'b', 'a', 'c', 'b', 'a'];
    const histogram = privateHistogram(values);
    for (const count of Object.values(histogram)) {
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  it('has the same keys as the input categories', () => {
    const values = ['x', 'y', 'x', 'z'];
    const histogram = privateHistogram(values, { ...DEFAULT_DP_CONFIG, enabled: false });
    expect(Object.keys(histogram).sort()).toEqual(['x', 'y', 'z'].sort());
  });

  it('returns exact counts when DP is disabled', () => {
    const values = ['cat', 'dog', 'cat', 'cat', 'dog'];
    const histogram = privateHistogram(values, { ...DEFAULT_DP_CONFIG, enabled: false });
    expect(histogram.cat).toBe(3);
    expect(histogram.dog).toBe(2);
  });

  it('handles empty array', () => {
    expect(privateHistogram([])).toEqual({});
  });
});

// ─── DEFAULT_DP_CONFIG ───────────────────────────────────────────────────────

describe('DEFAULT_DP_CONFIG', () => {
  it('has epsilon = 1.0', () => {
    expect(DEFAULT_DP_CONFIG.epsilon).toBe(1.0);
  });

  it('has sensitivity = 1.0', () => {
    expect(DEFAULT_DP_CONFIG.sensitivity).toBe(1.0);
  });

  it('is enabled by default', () => {
    expect(DEFAULT_DP_CONFIG.enabled).toBe(true);
  });
});
