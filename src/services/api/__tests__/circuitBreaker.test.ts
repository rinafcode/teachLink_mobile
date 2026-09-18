/**
 * Unit tests for src/services/api/circuitBreaker.ts
 *
 * Covers the documented state machine:
 *   CLOSED ──(5 failures / 60 s)──► OPEN ──(30 s)──► HALF_OPEN
 *   HALF_OPEN ──(probe ok)──► CLOSED
 *   HALF_OPEN ──(probe fail)──► OPEN
 *
 * Time-dependent behaviour (rolling failure window, recovery clock) is tested
 * with fake timers so no test relies on real wall-clock delays.
 */

import { CircuitBreaker, CircuitOpenError, circuitBreakerRegistry } from '../circuitBreaker';

jest.mock('../../../utils/logger', () => ({
  appLogger: {
    warnSync: jest.fn(),
  },
}));

const FAILURE_THRESHOLD = 5;
const FAILURE_WINDOW_MS = 60_000;
const RECOVERY_WINDOW_MS = 30_000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeBreaker(): CircuitBreaker {
  return new CircuitBreaker('test-service');
}

async function failExecution(breaker: CircuitBreaker): Promise<void> {
  await expect(breaker.execute(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
}

/** Fail `count` consecutive executions so each failure is recorded. */
async function failTimes(breaker: CircuitBreaker, count: number): Promise<void> {
  for (let i = 0; i < count; i += 1) {
    await failExecution(breaker);
  }
}

function advanceMs(ms: number): void {
  jest.setSystemTime(jest.now() + ms);
}

// ─── Setup ───────────────────────────────────────────────────────────────────

describe('circuitBreaker', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ─── CircuitOpenError ──────────────────────────────────────────────────────

  describe('CircuitOpenError', () => {
    it('carries the service name, code and a descriptive message', () => {
      const err = new CircuitOpenError('auth');

      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe('CircuitOpenError');
      expect(err.service).toBe('auth');
      expect(err.code).toBe('CIRCUIT_OPEN');
      expect(err.message).toContain('auth');
    });
  });

  // ─── CLOSED state ──────────────────────────────────────────────────────────

  describe('CLOSED state', () => {
    it('starts CLOSED and returns the wrapped result (happy path)', async () => {
      const breaker = makeBreaker();

      expect(breaker.getState()).toBe('CLOSED');
      await expect(breaker.execute(() => Promise.resolve('ok'))).resolves.toBe('ok');
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('propagates the original error of the wrapped operation', async () => {
      const breaker = makeBreaker();

      await expect(
        breaker.execute(() => Promise.reject(new Error('network down')))
      ).rejects.toThrow('network down');
    });

    it('stays CLOSED while failures stay below the threshold', async () => {
      const breaker = makeBreaker();

      await failTimes(breaker, FAILURE_THRESHOLD - 1);

      expect(breaker.getState()).toBe('CLOSED');
    });

    it('opens the circuit after the configured number of failures', async () => {
      const breaker = makeBreaker();

      await failTimes(breaker, FAILURE_THRESHOLD);

      expect(breaker.getState()).toBe('OPEN');
    });
  });

  // ─── Rolling failure window ────────────────────────────────────────────────

  describe('rolling failure window', () => {
    it('prunes failures that fall outside the window', async () => {
      const breaker = makeBreaker();

      await failTimes(breaker, FAILURE_THRESHOLD - 1);
      advanceMs(FAILURE_WINDOW_MS + 1);

      // The earlier failures are stale, so this one must not trip the breaker.
      await failTimes(breaker, 1);

      expect(breaker.getState()).toBe('CLOSED');
    });

    it('still opens when enough failures happen within the window', async () => {
      const breaker = makeBreaker();

      await failTimes(breaker, FAILURE_THRESHOLD - 2);
      advanceMs(FAILURE_WINDOW_MS / 2);
      await failTimes(breaker, 2);

      expect(breaker.getState()).toBe('OPEN');
    });
  });

  // ─── OPEN state (fast-fail) ────────────────────────────────────────────────

  describe('OPEN state', () => {
    it('fast-fails execute() without invoking the wrapped operation', async () => {
      const breaker = makeBreaker();
      const fn = jest.fn(() => Promise.resolve('should not run'));
      await failTimes(breaker, FAILURE_THRESHOLD);

      await expect(breaker.execute(fn)).rejects.toThrow(CircuitOpenError);
      expect(fn).not.toHaveBeenCalled();
      expect(breaker.getState()).toBe('OPEN');
    });
  });

  // ─── Recovery (HALF_OPEN probe) ────────────────────────────────────────────

  describe('recovery via HALF_OPEN', () => {
    it('probes after the recovery window and closes on success', async () => {
      const breaker = makeBreaker();
      await failTimes(breaker, FAILURE_THRESHOLD);
      advanceMs(RECOVERY_WINDOW_MS);

      await expect(breaker.execute(() => Promise.resolve('probe ok'))).resolves.toBe('probe ok');
      expect(breaker.getState()).toBe('CLOSED');

      // Success must reset the failure history: a fresh full window of
      // failures is required to open the circuit again.
      await failTimes(breaker, FAILURE_THRESHOLD - 1);
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('reopens on a failed probe and restarts the recovery clock', async () => {
      const breaker = makeBreaker();
      await failTimes(breaker, FAILURE_THRESHOLD);
      advanceMs(RECOVERY_WINDOW_MS);

      // Probe fails while HALF_OPEN → back to OPEN, recovery timer restarts.
      await failExecution(breaker);
      expect(breaker.getState()).toBe('OPEN');

      advanceMs(RECOVERY_WINDOW_MS - 1_000);
      await expect(breaker.execute(() => Promise.resolve('too soon'))).rejects.toThrow(
        CircuitOpenError
      );

      // After the restarted recovery window elapses, a probe is allowed again.
      advanceMs(1_000);
      await expect(breaker.execute(() => Promise.resolve('probe ok'))).resolves.toBe('probe ok');
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('fast-fails while the HALF_OPEN probe is still in flight', async () => {
      const breaker = makeBreaker();
      await failTimes(breaker, FAILURE_THRESHOLD);
      advanceMs(RECOVERY_WINDOW_MS);

      let releaseProbe!: (value?: unknown) => void;
      const probe = breaker.execute(
        () =>
          new Promise(resolve => {
            releaseProbe = resolve;
          })
      );

      // Concurrent call must not start a second probe.
      await expect(breaker.execute(() => Promise.resolve('second probe'))).rejects.toThrow(
        CircuitOpenError
      );

      releaseProbe();
      await expect(probe).resolves.toBeUndefined();
      expect(breaker.getState()).toBe('CLOSED');

      // Once the probe completes, normal calls go through again.
      await expect(breaker.execute(() => Promise.resolve('after probe'))).resolves.toBe(
        'after probe'
      );
    });

    it('recovers again after a second full open/close cycle', async () => {
      const breaker = makeBreaker();

      // First cycle: trip, recover.
      await failTimes(breaker, FAILURE_THRESHOLD);
      advanceMs(RECOVERY_WINDOW_MS);
      await expect(breaker.execute(() => Promise.resolve('probe ok'))).resolves.toBe('probe ok');
      expect(breaker.getState()).toBe('CLOSED');

      // Second cycle: the breaker must still allow recovery probes.
      await failTimes(breaker, FAILURE_THRESHOLD);
      advanceMs(RECOVERY_WINDOW_MS);
      await expect(breaker.execute(() => Promise.resolve('second probe ok'))).resolves.toBe(
        'second probe ok'
      );
      expect(breaker.getState()).toBe('CLOSED');
    });
  });

  // ─── Listeners ─────────────────────────────────────────────────────────────

  describe('addListener', () => {
    it('notifies listeners of state transitions', async () => {
      const breaker = makeBreaker();
      const listener = jest.fn();
      breaker.addListener(listener);

      await failTimes(breaker, FAILURE_THRESHOLD);

      expect(listener).toHaveBeenCalledWith('test-service', 'OPEN');
      expect(breaker.getState()).toBe('OPEN');
    });

    it('stops notifying after the unsubscribe function is called', async () => {
      const breaker = makeBreaker();
      const listener = jest.fn();
      const unsubscribe = breaker.addListener(listener);
      unsubscribe();

      await failTimes(breaker, FAILURE_THRESHOLD);

      expect(listener).not.toHaveBeenCalled();
    });

    it('does not let a throwing listener break the breaker or other listeners', async () => {
      const breaker = makeBreaker();
      const throwingListener = jest.fn(() => {
        throw new Error('listener bug');
      });
      const healthyListener = jest.fn();
      breaker.addListener(throwingListener);
      breaker.addListener(healthyListener);

      await expect(breaker.execute(() => Promise.resolve('ok'))).resolves.toBe('ok');

      await failTimes(breaker, FAILURE_THRESHOLD);

      expect(throwingListener).toHaveBeenCalled();
      expect(healthyListener).toHaveBeenCalledWith('test-service', 'OPEN');
    });
  });

  // ─── Registry ──────────────────────────────────────────────────────────────

  describe('circuitBreakerRegistry', () => {
    it('returns the same breaker instance per service', () => {
      expect(circuitBreakerRegistry.get('shared-service')).toBe(
        circuitBreakerRegistry.get('shared-service')
      );
    });

    it('returns distinct breakers for distinct services', () => {
      const a = circuitBreakerRegistry.get('registry-a');
      const b = circuitBreakerRegistry.get('registry-b');

      expect(a).not.toBe(b);
      expect(a.service).toBe('registry-a');
      expect(b.service).toBe('registry-b');
    });

    it('pre-registers the four health-check service groups', () => {
      const states = circuitBreakerRegistry.getStates();

      for (const service of ['auth', 'sync', 'notifications', 'payments']) {
        expect(states[service]).toBe('CLOSED');
      }
    });

    it('reflects live breaker state in getStates()', async () => {
      const breaker = circuitBreakerRegistry.get('payments');
      await failTimes(breaker, FAILURE_THRESHOLD);

      expect(circuitBreakerRegistry.getStates().payments).toBe('OPEN');
    });

    it('exposes all known breakers via all()', () => {
      const all = circuitBreakerRegistry.all();

      expect(all).toBeInstanceOf(Map);
      expect(Array.from(all.keys())).toEqual(
        expect.arrayContaining(['auth', 'sync', 'notifications', 'payments'])
      );
    });
  });
});
