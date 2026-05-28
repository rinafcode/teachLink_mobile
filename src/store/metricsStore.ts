import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type DashboardRole = 'admin' | 'instructor' | 'student';
export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface AlertThresholds {
  errorCountWarning: number;
  errorCountCritical: number;
  avgQuizScoreWarning: number;
}

export interface DashboardAlert {
  id: string;
  severity: AlertSeverity;
  message: string;
  timestamp: number;
}

interface MetricsState {
  // Configurable alert thresholds
  thresholds: AlertThresholds;
  // IDs of alerts the user has dismissed in this session
  dismissedAlertIds: string[];
  // Polling interval in ms (default 30s)
  refreshIntervalMs: number;
  // Whether auto-refresh is enabled
  autoRefreshEnabled: boolean;
  // Role view override (null = use the authenticated user's role)
  roleOverride: DashboardRole | null;

  // Actions
  setThresholds: (thresholds: Partial<AlertThresholds>) => void;
  dismissAlert: (id: string) => void;
  clearDismissedAlerts: () => void;
  setRefreshInterval: (ms: number) => void;
  setAutoRefresh: (enabled: boolean) => void;
  setRoleOverride: (role: DashboardRole | null) => void;
}

const DEFAULT_THRESHOLDS: AlertThresholds = {
  errorCountWarning: 2,
  errorCountCritical: 5,
  avgQuizScoreWarning: 60,
};

export const useMetricsStore = create<MetricsState>()(
  persist(
    (set) => ({
      thresholds: DEFAULT_THRESHOLDS,
      dismissedAlertIds: [],
      refreshIntervalMs: 30_000,
      autoRefreshEnabled: true,
      roleOverride: null,

      setThresholds: (partial) =>
        set((s) => ({ thresholds: { ...s.thresholds, ...partial } })),

      dismissAlert: (id) =>
        set((s) => ({ dismissedAlertIds: [...s.dismissedAlertIds, id] })),

      clearDismissedAlerts: () => set({ dismissedAlertIds: [] }),

      setRefreshInterval: (ms) => set({ refreshIntervalMs: ms }),

      setAutoRefresh: (enabled) => set({ autoRefreshEnabled: enabled }),

      setRoleOverride: (role) => set({ roleOverride: role }),
    }),
    {
      name: 'metrics-dashboard-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        thresholds: state.thresholds,
        refreshIntervalMs: state.refreshIntervalMs,
        autoRefreshEnabled: state.autoRefreshEnabled,
        roleOverride: state.roleOverride,
      }),
    }
  )
);
