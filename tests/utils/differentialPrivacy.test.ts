import {
  addGaussianNoise,
  addLaplaceNoise,
  applyNoise,
  randomizedResponse,
  sanitizeEventProperties,
} from '../../src/utils/differentialPrivacy';
import { PrivacyBudgetManager } from '../../src/utils/privacyBudgetManager';

// ─── addLaplaceNoise ──────────────────────────────────────────────────────────

describe('addLaplaceNoise', () => {
  it('returns a number', () => {
    expect(typeof addLaplaceNoise(10, 1)).toBe('number');
  });

  it('adds noise (output differs from input on average)', () => {
    const samples = Array.from({ length: 100 }, () => addLaplaceNoise(0, 1));
    const allZero = samples.every(v => v === 0);
    expect(allZero).toBe(false);
  });

  it('noise is smaller with larger epsilon (less noise)', () => {
    const runs = 500;
    const avgAbsLow =
      Array.from({ length: runs }, () => Math.abs(addLaplaceNoise(0, 0.1))).reduce(
        (a, b) => a + b
      ) / runs;
    const avgAbsHigh =
      Array.from({ length: runs }, () => Math.abs(addLaplaceNoise(0, 10))).reduce((a, b) => a + b) /
      runs;
    expect(avgAbsLow).toBeGreaterThan(avgAbsHigh);
  });

  it('throws for non-positive epsilon', () => {
    expect(() => addLaplaceNoise(5, 0)).toThrow();
    expect(() => addLaplaceNoise(5, -1)).toThrow();
  });
});

// ─── addGaussianNoise ─────────────────────────────────────────────────────────

describe('addGaussianNoise', () => {
  it('returns a number', () => {
    expect(typeof addGaussianNoise(10, 1)).toBe('number');
  });

  it('adds noise', () => {
    const samples = Array.from({ length: 100 }, () => addGaussianNoise(0, 1));
    expect(samples.every(v => v === 0)).toBe(false);
  });

  it('throws for non-positive epsilon', () => {
    expect(() => addGaussianNoise(5, 0)).toThrow();
  });

  it('throws for invalid delta', () => {
    expect(() => addGaussianNoise(5, 1, 0)).toThrow();
    expect(() => addGaussianNoise(5, 1, 1)).toThrow();
  });
});

// ─── applyNoise ───────────────────────────────────────────────────────────────

describe('applyNoise', () => {
  const config = { epsilon: 1, delta: 1e-5, sensitivity: 1 };

  it('applies laplace noise by default', () => {
    const result = applyNoise(100, config);
    expect(typeof result).toBe('number');
  });

  it('applies gaussian noise when specified', () => {
    const result = applyNoise(100, config, 'gaussian');
    expect(typeof result).toBe('number');
  });
});

// ─── randomizedResponse ───────────────────────────────────────────────────────

describe('randomizedResponse', () => {
  it('returns a boolean', () => {
    expect(typeof randomizedResponse(true, 1)).toBe('boolean');
  });

  it('returns the true value more often than not for large epsilon', () => {
    const runs = 1000;
    const trueCount = Array.from({ length: runs }, () => randomizedResponse(true, 10)).filter(
      Boolean
    ).length;
    // With ε=10, p ≈ 0.9999 — should be true almost always
    expect(trueCount).toBeGreaterThan(900);
  });

  it('throws for non-positive epsilon', () => {
    expect(() => randomizedResponse(true, 0)).toThrow();
  });
});

// ─── sanitizeEventProperties ──────────────────────────────────────────────────

describe('sanitizeEventProperties', () => {
  const config = { epsilon: 1, delta: 1e-5, sensitivity: 1 };

  it('adds noise to numeric values', () => {
    const props = { count: 5, label: 'click' };
    const sanitized = sanitizeEventProperties(props, config);
    // label unchanged
    expect(sanitized.label).toBe('click');
    // count is a number but may differ
    expect(typeof sanitized.count).toBe('number');
  });

  it('applies randomized response to boolean values', () => {
    const props = { active: true };
    const sanitized = sanitizeEventProperties(props, config);
    expect(typeof sanitized.active).toBe('boolean');
  });

  it('passes through null and undefined unchanged', () => {
    const props = { a: null, b: undefined };
    const sanitized = sanitizeEventProperties(props, config);
    expect(sanitized.a).toBeNull();
    expect(sanitized.b).toBeUndefined();
  });

  it('passes through string values unchanged', () => {
    const props = { screen: 'home' };
    const sanitized = sanitizeEventProperties(props, config);
    expect(sanitized.screen).toBe('home');
  });
});

// ─── PrivacyBudgetManager ─────────────────────────────────────────────────────

describe('PrivacyBudgetManager', () => {
  it('allows consumption within budget', () => {
    const mgr = new PrivacyBudgetManager(5);
    expect(mgr.consume(1)).toBe(true);
    expect(mgr.consume(2)).toBe(true);
    expect(mgr.getStatus().consumed).toBe(3);
  });

  it('rejects consumption that exceeds budget', () => {
    const mgr = new PrivacyBudgetManager(1);
    expect(mgr.consume(0.9)).toBe(true);
    expect(mgr.consume(0.2)).toBe(false); // would exceed 1.0
  });

  it('reports exhausted correctly', () => {
    const mgr = new PrivacyBudgetManager(1);
    mgr.consume(1);
    expect(mgr.getStatus().exhausted).toBe(true);
    expect(mgr.getStatus().remaining).toBe(0);
  });

  it('resets consumed budget', () => {
    const mgr = new PrivacyBudgetManager(5);
    mgr.consume(3);
    mgr.reset();
    expect(mgr.getStatus().consumed).toBe(0);
    expect(mgr.getStatus().exhausted).toBe(false);
  });

  it('throws for non-positive totalBudget', () => {
    expect(() => new PrivacyBudgetManager(0)).toThrow();
    expect(() => new PrivacyBudgetManager(-1)).toThrow();
  });

  it('throws for non-positive epsilon in consume', () => {
    const mgr = new PrivacyBudgetManager(5);
    expect(() => mgr.consume(0)).toThrow();
  });
});
