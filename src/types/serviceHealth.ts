/**
 * src/types/serviceHealth.ts
 *
 * Shared types for service health status tracking.
 * Referenced by healthDashboardStore, CircuitBreaker, and UI components.
 */

/** Fine-grained status for a monitored service. */
export type ServiceStatus =
  | 'ok'        // Responding within thresholds
  | 'timeout'   // Last check exceeded the timeout budget
  | 'degraded'  // 3+ consecutive timeouts, or circuit breaker open
  | 'error'     // Non-timeout failure (5xx, network error, etc.)
  | 'unknown';  // Check has not run yet

/** Circuit breaker FSM states. */
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/** Per-service health entry stored in the dashboard store. */
export interface ServiceHealthStatus {
  service: string;
  status: ServiceStatus;
  /** ISO timestamp of the last completed check. */
  lastCheckedAt?: number;
  /** Number of consecutive timeouts (resets on any non-timeout outcome). */
  consecutiveTimeouts?: number;
  /** Current circuit breaker state for this service. */
  circuitState?: CircuitState;
}