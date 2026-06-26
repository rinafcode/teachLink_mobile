/**
 * useDashboardMetrics — Issue #390
 *
 * Convenience hook that wires the metricsStore into a component.
 * Initialises the store on first mount and tears down the interval on unmount.
 */

import { useEffect } from 'react';
import type { DashboardAlert, DashboardSnapshot } from '../services/metricsService';
import { DashboardView, useMetricsStore } from '../store/metricsStore';

export interface UseDashboardMetricsResult {
  snapshot: DashboardSnapshot | null;
  isRefreshing: boolean;
  error: string | null;
  activeView: DashboardView;
  autoRefreshEnabled: boolean;
  refreshIntervalMs: number;
  alerts: DashboardAlert[];
  refresh: () => Promise<void>;
  setActiveView: (view: DashboardView) => void;
  setAutoRefresh: (enabled: boolean) => void;
  setRefreshInterval: (ms: number) => void;
}

export function useDashboardMetrics(): UseDashboardMetricsResult {
  const store = useMetricsStore();

  useEffect(() => {
    void store.init();
    return () => store.destroy();
    // store.init / store.destroy are stable references (zustand actions never change)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    snapshot: store.snapshot,
    isRefreshing: store.isRefreshing,
    error: store.error,
    activeView: store.activeView,
    autoRefreshEnabled: store.autoRefreshEnabled,
    refreshIntervalMs: store.refreshIntervalMs,
    alerts: store.snapshot?.alerts ?? [],
    refresh: store.refresh,
    setActiveView: store.setActiveView,
    setAutoRefresh: store.setAutoRefresh,
    setRefreshInterval: store.setRefreshInterval,
  };
}

export default useDashboardMetrics;
