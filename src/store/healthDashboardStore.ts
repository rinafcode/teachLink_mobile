/**
 * healthDashboardStore — Zustand store for the real-time health dashboard.
 *
 * Holds the latest health snapshot, active alerts, user-configured thresholds,
 * and polling state. Intentionally NOT persisted — always starts fresh.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
    AlertThresholds,
    DEFAULT_THRESHOLDS,
    HealthSnapshot,
    MetricAlert,
} from '../services/healthMetrics';

import { shallowDiff } from '../utils/stateDiff';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DashboardStatus = 'idle' | 'polling' | 'error';

interface HealthDashboardState {
  // Data
  snapshot: HealthSnapshot | null;
  alerts: MetricAlert[];
  thresholds: AlertThresholds;

  // UI state
  status: DashboardStatus;
  lastUpdated: number | null;
  /** How often to refresh in ms */
  refreshIntervalMs: number;
  /** Whether auto-refresh is active */
  isAutoRefresh: boolean;
  /** Dismissed alert IDs (cleared on next full refresh) */
  dismissedAlertIds: Set<string>;

  // Actions
  setSnapshot: (snapshot: HealthSnapshot) => void;
  setAlerts: (alerts: MetricAlert[]) => void;
  setThresholds: (thresholds: Partial<AlertThresholds>) => void;
  setStatus: (status: DashboardStatus) => void;
  setRefreshInterval: (ms: number) => void;
  toggleAutoRefresh: () => void;
  dismissAlert: (id: string) => void;
  clearDismissed: () => void;
  reset: () => void;
}

// ─── Initial state ────────────────────────────────────────────────────────────

const initialState = {
  snapshot: null,
  alerts: [],
  thresholds: DEFAULT_THRESHOLDS,
  status: 'idle' as DashboardStatus,
  lastUpdated: null,
  refreshIntervalMs: 10_000, // 10 seconds default
  isAutoRefresh: true,
  dismissedAlertIds: new Set<string>(),
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useHealthDashboardStore = create<HealthDashboardState>()(
  devtools(
    (set) => ({
      ...initialState,

      setSnapshot: (snapshot) =>
        set(
          (state) => {
            if (!state.snapshot && !snapshot) return state;
            if (!state.snapshot) return { snapshot, lastUpdated: Date.now() };
            const diff = shallowDiff(state.snapshot, snapshot);
            if (!diff) return state;
            return { snapshot: { ...state.snapshot, ...diff } as HealthSnapshot, lastUpdated: Date.now() };
          },
          false,
          'setSnapshot'
        ),

      setAlerts: (alerts) =>
        set({ alerts }, false, 'setAlerts'),

      setThresholds: (partial) =>
        set(
          (state) => {
            const diff = shallowDiff(state.thresholds, partial);
            if (!diff) return state; // Return unchanged state to bypass allocation
            return { thresholds: { ...state.thresholds, ...diff } };
          },
          false,
          'setThresholds'
        ),

      setStatus: (status) =>
        set({ status }, false, 'setStatus'),

      setRefreshInterval: (refreshIntervalMs) =>
        set({ refreshIntervalMs }, false, 'setRefreshInterval'),

      toggleAutoRefresh: () =>
        set(
          (state) => ({ isAutoRefresh: !state.isAutoRefresh }),
          false,
          'toggleAutoRefresh'
        ),

      dismissAlert: (id) =>
        set(
          (state) => {
            const next = new Set(state.dismissedAlertIds);
            next.add(id);
            return { dismissedAlertIds: next };
          },
          false,
          'dismissAlert'
        ),

      clearDismissed: () =>
        set({ dismissedAlertIds: new Set() }, false, 'clearDismissed'),

      reset: () =>
        set({ ...initialState, dismissedAlertIds: new Set() }, false, 'reset'),
    }),
    { name: 'HealthDashboardStore' }
  )
);

// ─── Selectors ────────────────────────────────────────────────────────────────

/** Returns only non-dismissed alerts */
export const selectVisibleAlerts = (state: HealthDashboardState): MetricAlert[] =>
  state.alerts.filter((a) => !state.dismissedAlertIds.has(a.id));

/** Returns the highest severity across all visible alerts */
export const selectOverallStatus = (
  state: HealthDashboardState
): 'ok' | 'warning' | 'critical' => {
  const visible = selectVisibleAlerts(state);
  if (visible.some((a) => a.severity === 'critical')) return 'critical';
  if (visible.some((a) => a.severity === 'warning')) return 'warning';
  return 'ok';
};
