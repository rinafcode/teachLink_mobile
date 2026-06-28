/**
 * src/store/slices/healthDashboardStore.ts
 *
 * Changes vs original:
 *  - ServiceHealthStatus imported from shared types (status is now ServiceStatus)
 *  - Tracks consecutiveTimeouts per service; escalates to 'degraded' after 3
 *  - Integrates circuit breaker state from circuitBreakerRegistry
 *  - selectIsServiceDegraded now covers both 'degraded' status AND open circuit
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { HEALTH_TO_FEATURE_MAP, isServiceDegraded, ServiceName } from '../config/degradationConfig';
import { circuitBreakerRegistry, CircuitOpenError } from '../services/api/circuitBreaker';
import {
  AlertThresholds,
  DEFAULT_THRESHOLDS,
  HealthSnapshot,
  MetricAlert,
} from '../services/healthMetrics';
import { CircuitState, ServiceHealthStatus, ServiceStatus } from '../types/serviceHealth';
import { appLogger } from '../utils/logger';
import { shallowDiff } from '../utils/stateDiff';
import { useFeatureFlagStore } from './featureFlagStore';

export type { ServiceHealthStatus };

export type DashboardStatus = 'idle' | 'polling' | 'error';

// ─── Constants ─────────────────────────────────────────────────────────────

/** Number of consecutive timeouts before a service is escalated to 'degraded'. */
const TIMEOUT_ESCALATION_THRESHOLD = 3;

/** Per-request timeout budget for health checks (ms). */
const HEALTH_CHECK_TIMEOUT_MS = 5_000;

// ─── State shape ───────────────────────────────────────────────────────────

interface HealthDashboardState {
  snapshot: HealthSnapshot | null;
  alerts: MetricAlert[];
  thresholds: AlertThresholds;
  serviceHealthStatuses: ServiceHealthStatus[];
  status: DashboardStatus;
  lastUpdated: number | null;
  lastChecked: number | null;
  lastNetworkCheck: number | null;
  refreshIntervalMs: number;
  isAutoRefresh: boolean;
  dismissedAlertIds: Set<string>;

  // Actions
  setSnapshot: (snapshot: HealthSnapshot, serviceStatuses?: ServiceHealthStatus[]) => void;
  setAlerts: (alerts: MetricAlert[]) => void;
  setThresholds: (thresholds: Partial<AlertThresholds>) => void;
  setStatus: (status: DashboardStatus) => void;
  setLastChecked: () => void;
  setLastNetworkCheck: () => void;
  setRefreshInterval: (ms: number) => void;
  toggleAutoRefresh: () => void;
  dismissAlert: (id: string) => void;
  clearDismissed: () => void;
  reset: () => void;

  // Health check runner (Issue 1 — timeout distinction)
  runHealthCheck: (
    service: ServiceName,
    checkFn: () => Promise<void>
  ) => Promise<void>;

  // Circuit breaker state sync (Issue 2)
  syncCircuitBreakerStates: () => void;
}

const initialState = {
  snapshot: null,
  alerts: [],
  thresholds: DEFAULT_THRESHOLDS,
  serviceHealthStatuses: [] as ServiceHealthStatus[],
  status: 'idle' as DashboardStatus,
  lastUpdated: null,
  lastChecked: null,
  lastNetworkCheck: null,
  refreshIntervalMs: 10_000,
  isAutoRefresh: true,
  dismissedAlertIds: new Set<string>(),
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function applyDegradationFlags(serviceStatuses: ServiceHealthStatus[]): void {
  const flagStore = useFeatureFlagStore.getState();
  for (const { service, status } of serviceStatuses) {
    const flagEntries = HEALTH_TO_FEATURE_MAP[service as ServiceName];
    if (!flagEntries) continue;
    const degraded = isServiceDegraded(status);
    for (const entry of flagEntries) {
      if (entry.adminOverride) continue;
      const currentDef = flagStore.getDefinition(entry.flagKey);
      const updatedDef = { ...(currentDef ?? {}), enabled: !degraded };
      useFeatureFlagStore.setState(state => ({
        flags: {
          ...state.flags,
          flags: { ...state.flags.flags, [entry.flagKey]: updatedDef },
        },
      }));
    }
  }
}

/**
 * Merge an updated ServiceHealthStatus into the existing array.
 * Preserves consecutiveTimeouts from the previous entry when the status
 * is still 'timeout'; resets it on any other outcome.
 */
function mergeServiceStatus(
  existing: ServiceHealthStatus[],
  next: ServiceHealthStatus
): ServiceHealthStatus[] {
  const idx = existing.findIndex(s => s.service === next.service);
  const prev = existing[idx];

  let consecutiveTimeouts = 0;
  if (next.status === 'timeout') {
    consecutiveTimeouts = (prev?.consecutiveTimeouts ?? 0) + 1;
  }

  // Escalate to 'degraded' after threshold consecutive timeouts
  const resolvedStatus: ServiceStatus =
    consecutiveTimeouts >= TIMEOUT_ESCALATION_THRESHOLD ? 'degraded' : next.status;

  const merged: ServiceHealthStatus = {
    ...next,
    status: resolvedStatus,
    consecutiveTimeouts,
    lastCheckedAt: Date.now(),
  };

  if (idx === -1) return [...existing, merged];
  const updated = [...existing];
  updated[idx] = merged;
  return updated;
}

// ─── Store ─────────────────────────────────────────────────────────────────

export const useHealthDashboardStore = create<HealthDashboardState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // ── setSnapshot ──────────────────────────────────────────────────────

      setSnapshot: (snapshot, serviceStatuses) =>
        set(
          state => {
            if (!state.snapshot && !snapshot) return state;

            let nextSnapshot: HealthSnapshot;
            if (!state.snapshot) {
              nextSnapshot = snapshot;
            } else {
              const diff = shallowDiff(state.snapshot, snapshot);
              if (!diff) {
                if (serviceStatuses?.length) applyDegradationFlags(serviceStatuses);
                return state;
              }
              nextSnapshot = { ...state.snapshot, ...diff } as HealthSnapshot;
            }

            // Merge each incoming service status through the timeout-tracking
            // helper so consecutiveTimeouts is maintained correctly.
            let nextStatuses = state.serviceHealthStatuses;
            if (serviceStatuses?.length) {
              for (const s of serviceStatuses) {
                nextStatuses = mergeServiceStatus(nextStatuses, s);
              }
              applyDegradationFlags(nextStatuses);
            }

            return {
              snapshot: nextSnapshot,
              lastUpdated: Date.now(),
              serviceHealthStatuses: nextStatuses,
            };
          },
          false,
          'setSnapshot'
        ),

      // ── runHealthCheck (Issue 1) ─────────────────────────────────────────
      //
      // Wraps a caller-supplied async health probe with:
      //   1. AbortController timeout → status 'timeout'
      //   2. Consecutive timeout escalation → status 'degraded'
      //   3. Non-timeout errors → status 'error'
      //   4. Success → status 'ok'
      //
      // Also routes the call through the per-service circuit breaker (Issue 2).

      runHealthCheck: async (service, checkFn) => {
        const breaker = circuitBreakerRegistry.get(service);

        const wrappedCheck = async () => {
          const controller = new AbortController();
          const timeoutHandle = setTimeout(
            () => controller.abort(),
            HEALTH_CHECK_TIMEOUT_MS
          );

          try {
            await checkFn();
            clearTimeout(timeoutHandle);
          } catch (err) {
            clearTimeout(timeoutHandle);
            throw err;
          }
        };

        let nextStatus: ServiceStatus;

        try {
          await breaker.execute(wrappedCheck);
          nextStatus = 'ok';
        } catch (err) {
          if (err instanceof CircuitOpenError) {
            // Circuit is open — treat as degraded without running the probe
            nextStatus = 'degraded';
            appLogger.warnSync(`[HealthCheck] Circuit open for "${service}" — skipping probe`);
          } else if (
            err instanceof Error &&
            (err.name === 'AbortError' || err.message?.toLowerCase().includes('abort'))
          ) {
            nextStatus = 'timeout';
            appLogger.warnSync(`[HealthCheck] Timeout for "${service}"`, { service });
          } else {
            nextStatus = 'error';
            appLogger.errorSync(`[HealthCheck] Error for "${service}"`, err as Error, { service });
          }
        }

        // Write the result back into the store via mergeServiceStatus
        set(
          state => {
            const circuitState = breaker.getState();
            const incoming: ServiceHealthStatus = {
              service,
              status: nextStatus,
              circuitState,
            };
            const nextStatuses = mergeServiceStatus(state.serviceHealthStatuses, incoming);
            applyDegradationFlags(nextStatuses);
            return { serviceHealthStatuses: nextStatuses };
          },
          false,
          'runHealthCheck'
        );
      },

      // ── syncCircuitBreakerStates (Issue 2) ──────────────────────────────
      //
      // Pulls the current state from every registered circuit breaker and
      // patches it onto the matching serviceHealthStatuses entry without
      // disturbing the status or consecutiveTimeouts fields.

      syncCircuitBreakerStates: () => {
        const states = circuitBreakerRegistry.getStates();
        set(
          state => {
            let updated = [...state.serviceHealthStatuses];
            for (const [service, circuitState] of Object.entries(states)) {
              const idx = updated.findIndex(s => s.service === service);
              if (idx === -1) {
                // Service not yet in the list — seed with 'unknown'
                updated.push({ service, status: 'unknown', circuitState });
              } else {
                updated[idx] = { ...updated[idx], circuitState };
                // If the circuit just opened, ensure status reflects degraded
                if (circuitState === 'OPEN' && updated[idx].status !== 'degraded') {
                  updated[idx] = { ...updated[idx], status: 'degraded' };
                }
              }
            }
            return { serviceHealthStatuses: updated };
          },
          false,
          'syncCircuitBreakerStates'
        );
      },

      // ── Standard actions (unchanged) ─────────────────────────────────────

      setAlerts: alerts => set({ alerts }, false, 'setAlerts'),

      setThresholds: partial =>
        set(
          state => {
            const diff = shallowDiff(state.thresholds, partial);
            if (!diff) return state;
            return { thresholds: { ...state.thresholds, ...diff } };
          },
          false,
          'setThresholds'
        ),

      setStatus: status => set({ status }, false, 'setStatus'),

      setLastChecked: () => set({ lastChecked: Date.now() }, false, 'setLastChecked'),

      setLastNetworkCheck: () =>
        set(
          { lastNetworkCheck: Date.now(), lastChecked: Date.now() },
          false,
          'setLastNetworkCheck'
        ),

      setRefreshInterval: refreshIntervalMs =>
        set({ refreshIntervalMs }, false, 'setRefreshInterval'),

      toggleAutoRefresh: () =>
        set(state => ({ isAutoRefresh: !state.isAutoRefresh }), false, 'toggleAutoRefresh'),

      dismissAlert: id =>
        set(
          state => {
            const next = new Set(state.dismissedAlertIds);
            next.add(id);
            return { dismissedAlertIds: next };
          },
          false,
          'dismissAlert'
        ),

      clearDismissed: () => set({ dismissedAlertIds: new Set() }, false, 'clearDismissed'),

      reset: () => set({ ...initialState, dismissedAlertIds: new Set() }, false, 'reset'),
    }),
    { name: 'HealthDashboardStore' }
  )
);

// ─── Selectors ─────────────────────────────────────────────────────────────

export const selectVisibleAlerts = (state: HealthDashboardState): MetricAlert[] =>
  state.alerts.filter(a => !state.dismissedAlertIds.has(a.id));

export const selectOverallStatus = (
  state: HealthDashboardState
): 'ok' | 'warning' | 'critical' => {
  const visible = selectVisibleAlerts(state);
  if (visible.some(a => a.severity === 'critical')) return 'critical';
  if (visible.some(a => a.severity === 'warning')) return 'warning';
  return 'ok';
};

export const selectIsServiceDegraded =
  (service: ServiceName) =>
  (state: HealthDashboardState): boolean => {
    const entry = state.serviceHealthStatuses.find(s => s.service === service);
    if (!entry) return false;
    // Treat 'degraded', 'error', and an OPEN circuit as degraded
    return (
      isServiceDegraded(entry.status) ||
      entry.circuitState === 'OPEN'
    );
  };

/** Returns the circuit breaker state for a service, or undefined if unknown. */
export const selectCircuitState =
  (service: string) =>
  (state: HealthDashboardState): CircuitState | undefined =>
    state.serviceHealthStatuses.find(s => s.service === service)?.circuitState;