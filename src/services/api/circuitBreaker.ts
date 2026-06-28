/**
 * src/services/api/circuitBreaker.ts
 *
 * Circuit breaker pattern per endpoint group.
 *
 * State machine:
 *   CLOSED ──(5 failures / 60 s)──► OPEN ──(30 s)──► HALF_OPEN
 *   HALF_OPEN ──(probe ok)──► CLOSED
 *   HALF_OPEN ──(probe fail)──► OPEN
 *
 * Usage:
 *   const breaker = circuitBreakerRegistry.get('auth');
 *   breaker.execute(() => apiClient.get('/auth/me'));
 */

import { CircuitState } from '../../types/serviceHealth';
import { appLogger } from '../../utils/logger';

// ─── Config ────────────────────────────────────────────────────────────────

const FAILURE_THRESHOLD = 5;       // failures within the window to open
const FAILURE_WINDOW_MS = 60_000;  // 60-second rolling window
const RECOVERY_WINDOW_MS = 30_000; // wait before HALF_OPEN probe

// ─── Errors ────────────────────────────────────────────────────────────────

export class CircuitOpenError extends Error {
  readonly code = 'CIRCUIT_OPEN';
  readonly service: string;

  constructor(service: string) {
    super(`Circuit breaker OPEN for service "${service}" — fast-failing request`);
    this.name = 'CircuitOpenError';
    this.service = service;
  }
}

// ─── Listener type ─────────────────────────────────────────────────────────

export type CircuitStateListener = (service: string, state: CircuitState) => void;

// ─── CircuitBreaker ────────────────────────────────────────────────────────

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureTimestamps: number[] = [];
  private openedAt: number | null = null;
  private probeInFlight = false;
  private listeners: CircuitStateListener[] = [];

  constructor(readonly service: string) {}

  // ── Public API ────────────────────────────────────────────────────────────

  getState(): CircuitState {
    return this.state;
  }

  /**
   * Wraps an async operation with circuit-breaker logic.
   * Throws CircuitOpenError immediately when state is OPEN (and the recovery
   * window has not elapsed) so callers can return cached data or surface a
   * graceful error without waiting for a timeout.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.tick(); // re-evaluate state before every call

    if (this.state === 'OPEN') {
      throw new CircuitOpenError(this.service);
    }

    // HALF_OPEN: allow exactly one probe at a time
    if (this.state === 'HALF_OPEN' && this.probeInFlight) {
      throw new CircuitOpenError(this.service);
    }

    if (this.state === 'HALF_OPEN') {
      this.probeInFlight = true;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    } finally {
      if (this.state === 'HALF_OPEN') {
        this.probeInFlight = false;
      }
    }
  }

  /** Subscribe to state-change events (used by healthDashboardStore). */
  addListener(listener: CircuitStateListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  /**
   * Re-evaluate OPEN → HALF_OPEN transition based on elapsed time.
   * Called at the start of every execute() to handle recovery passively
   * without needing a background timer.
   */
  private tick(): void {
    if (this.state === 'OPEN' && this.openedAt !== null) {
      if (Date.now() - this.openedAt >= RECOVERY_WINDOW_MS) {
        this.transition('HALF_OPEN');
      }
    }
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.failureTimestamps = [];
      this.openedAt = null;
      this.transition('CLOSED');
    }
    // CLOSED: success doesn't reset timestamps (window handles staleness)
  }

  private onFailure(): void {
    const now = Date.now();

    if (this.state === 'HALF_OPEN') {
      // Probe failed — back to OPEN, reset the recovery clock
      this.openedAt = now;
      this.transition('OPEN');
      return;
    }

    // Prune timestamps outside the rolling window
    this.failureTimestamps = this.failureTimestamps.filter(
      t => now - t < FAILURE_WINDOW_MS
    );
    this.failureTimestamps.push(now);

    if (
      this.state === 'CLOSED' &&
      this.failureTimestamps.length >= FAILURE_THRESHOLD
    ) {
      this.openedAt = now;
      this.transition('OPEN');
    }
  }

  private transition(next: CircuitState): void {
    if (this.state === next) return;
    const prev = this.state;
    this.state = next;

    appLogger.warnSync(
      `[CircuitBreaker] "${this.service}": ${prev} → ${next}`,
      {
        service: this.service,
        failureCount: this.failureTimestamps.length,
        openedAt: this.openedAt,
      }
    );

    for (const listener of this.listeners) {
      try {
        listener(this.service, next);
      } catch {
        // listeners must never crash the breaker
      }
    }
  }
}

// ─── Registry ──────────────────────────────────────────────────────────────

/**
 * Singleton registry — one CircuitBreaker per endpoint group.
 * Groups mirror the health-check service names so the dashboard store
 * can read circuit state directly.
 */
class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();

  get(service: string): CircuitBreaker {
    let breaker = this.breakers.get(service);
    if (!breaker) {
      breaker = new CircuitBreaker(service);
      this.breakers.set(service, breaker);
    }
    return breaker;
  }

  all(): Map<string, CircuitBreaker> {
    return this.breakers;
  }

  /** Snapshot of every known breaker's state — for health dashboard. */
  getStates(): Record<string, CircuitState> {
    const result: Record<string, CircuitState> = {};
    for (const [service, breaker] of this.breakers) {
      result[service] = breaker.getState();
    }
    return result;
  }
}

export const circuitBreakerRegistry = new CircuitBreakerRegistry();

// Pre-register the four service groups referenced by the health checks
(['auth', 'sync', 'notifications', 'payments'] as const).forEach(s =>
  circuitBreakerRegistry.get(s)
);