import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import {
  AlertThresholds,
  DEFAULT_THRESHOLDS,
  HealthSnapshot,
  MetricAlert,
} from '../services/healthMetrics';
import { shallowDiff } from '../utils/stateDiff';
import { isServiceDegraded, HEALTH_TO_FEATURE_MAP, ServiceName } from '../config/degradationConfig';
import { useFeatureFlagStore } from './featureFlagStore';

export type DashboardStatus = 'idle' | 'polling' | 'error';

export interface ServiceHealthStatus {
  service: ServiceName;
  status: string;
}

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

function applyDegradationFlags(serviceStatuses: ServiceHealthStatus[]): void {
  const flagStore = useFeatureFlagStore.getState();
  for (const { service, status } of serviceStatuses) {
    const flagEntries = HEALTH_TO_FEATURE_MAP[service];
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

export const useHealthDashboardStore = create<HealthDashboardState>()(
  devtools(
    set => ({
      ...initialState,

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
                if (serviceStatuses && serviceStatuses.length > 0) {
                  applyDegradationFlags(serviceStatuses);
                }
                return state;
              }
              nextSnapshot = { ...state.snapshot, ...diff } as HealthSnapshot;
            }
            if (serviceStatuses && serviceStatuses.length > 0) {
              applyDegradationFlags(serviceStatuses);
            }
            return {
              snapshot: nextSnapshot,
              lastUpdated: Date.now(),
              serviceHealthStatuses: serviceStatuses ?? state.serviceHealthStatuses,
            };
          },
          false,
          'setSnapshot'
        ),

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
    return isServiceDegraded(entry.status);
  };
