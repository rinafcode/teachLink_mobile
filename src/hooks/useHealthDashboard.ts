/**
 * useHealthDashboard — hook that drives the real-time health dashboard.
 *
 * Responsibilities:
 *  1. Polls healthMetricsService on a configurable interval
 *  2. Writes snapshots + alerts into healthDashboardStore
 *  3. Exposes manual refresh + interval controls to the UI
 *  4. Seeds demo data in __DEV__ on first mount
 */

import { useCallback, useEffect, useRef } from 'react';
import {
    AlertThresholds,
    healthMetricsService,
} from '../services/healthMetrics';
import {
    selectOverallStatus,
    selectVisibleAlerts,
    useHealthDashboardStore,
} from '../store/healthDashboardStore';
import { appLogger } from '../utils/logger';

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useHealthDashboard() {
  const {
    snapshot,
    alerts,
    thresholds,
    status,
    lastUpdated,
    refreshIntervalMs,
    isAutoRefresh,
    setSnapshot,
    setAlerts,
    setThresholds,
    setStatus,
    setRefreshInterval,
    toggleAutoRefresh,
    dismissAlert,
    clearDismissed,
    dismissedAlertIds,
  } = useHealthDashboardStore();

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  // ── Core refresh logic ────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      setStatus('polling');
      const snap = healthMetricsService.getSnapshot();
      const newAlerts = healthMetricsService.evaluateAlerts(snap, thresholds);

      if (isMountedRef.current) {
        setSnapshot(snap);
        setAlerts(newAlerts);
        setStatus('idle');
        clearDismissed(); // reset dismissed list on each full refresh cycle
      }
    } catch (err) {
      appLogger.errorSync('[useHealthDashboard] Failed to refresh metrics', err as Error);
      if (isMountedRef.current) {
        setStatus('error');
      }
    }
  }, [thresholds, setSnapshot, setAlerts, setStatus, clearDismissed]);

  // ── Auto-refresh interval ─────────────────────────────────────────────────

  const startPolling = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      refresh();
    }, refreshIntervalMs);
  }, [refresh, refreshIntervalMs]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  useEffect(() => {
    isMountedRef.current = true;

    // Seed demo data in dev so the dashboard is immediately useful
    if (__DEV__) {
      healthMetricsService.seedDemoData();
    }

    // Initial fetch
    refresh();

    return () => {
      isMountedRef.current = false;
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restart polling whenever interval or auto-refresh flag changes
  useEffect(() => {
    if (isAutoRefresh) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => stopPolling();
  }, [isAutoRefresh, refreshIntervalMs, startPolling, stopPolling]);

  // ── Derived values ────────────────────────────────────────────────────────

  const visibleAlerts = selectVisibleAlerts({
    alerts,
    dismissedAlertIds,
  } as any);

  const overallStatus = selectOverallStatus({
    alerts,
    dismissedAlertIds,
  } as any);

  // ── Exposed API ───────────────────────────────────────────────────────────

  return {
    // Data
    snapshot,
    alerts: visibleAlerts,
    allAlerts: alerts,
    overallStatus,
    thresholds,

    // UI state
    status,
    lastUpdated,
    isAutoRefresh,
    refreshIntervalMs,

    // Actions
    refresh,
    dismissAlert,
    setThresholds: (partial: Partial<AlertThresholds>) => setThresholds(partial),
    setRefreshInterval,
    toggleAutoRefresh,
  };
}

export default useHealthDashboard;
