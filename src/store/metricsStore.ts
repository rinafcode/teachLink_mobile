/**
 * metricsStore — Issue #390
 *
 * Zustand store for the team metrics dashboard.  Holds the most-recent
 * DashboardSnapshot, a loading/error state, the selected role-based view, and
 * the auto-refresh interval handle.
 */

import { create } from 'zustand';

import { DashboardSnapshot, metricsService } from '../services/metricsService';
import logger from '../utils/logger';

// ─── Types ───────────────────────────────────────────────────────────────────

/** The role-based view the user has selected on the dashboard. */
export type DashboardView = 'overview' | 'performance' | 'errors' | 'users';

interface MetricsState {
  /** Latest collected snapshot, or null if never collected. */
  snapshot: DashboardSnapshot | null;
  /** Whether a snapshot collection is in progress. */
  isRefreshing: boolean;
  /** Error from the last failed collection, if any. */
  error: string | null;
  /** The currently selected dashboard view (customisable per role). */
  activeView: DashboardView;
  /** Whether auto-refresh is active. */
  autoRefreshEnabled: boolean;
  /** Refresh interval in milliseconds (default: 30 seconds). */
  refreshIntervalMs: number;
  /** Internal: handle returned by setInterval, used to cancel. */
  _intervalHandle: ReturnType<typeof setInterval> | null;

  // ── Actions ──────────────────────────────────────────────────────────────

  /** Collect a fresh snapshot immediately. */
  refresh: () => Promise<void>;
  /** Set the active dashboard view. */
  setActiveView: (view: DashboardView) => void;
  /** Toggle auto-refresh and start/stop the interval. */
  setAutoRefresh: (enabled: boolean) => void;
  /** Change the polling interval (stops and restarts if currently running). */
  setRefreshInterval: (ms: number) => void;
  /** Load the last persisted snapshot from storage (for offline support). */
  loadPersistedSnapshot: () => Promise<void>;
  /** Initialise the service and optionally start auto-refresh. */
  init: () => Promise<void>;
  /** Tear down intervals on unmount. */
  destroy: () => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useMetricsStore = create<MetricsState>((set, get) => ({
  snapshot: null,
  isRefreshing: false,
  error: null,
  activeView: 'overview',
  autoRefreshEnabled: true,
  refreshIntervalMs: 30_000,
  _intervalHandle: null,

  refresh: async () => {
    if (get().isRefreshing) return;
    set({ isRefreshing: true, error: null });

    try {
      const snapshot = await metricsService.collectSnapshot();
      set({ snapshot, isRefreshing: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error collecting metrics';
      logger.error('metricsStore: refresh failed', err);
      set({ isRefreshing: false, error: msg });
    }
  },

  setActiveView: (view) => set({ activeView: view }),

  setAutoRefresh: (enabled) => {
    const { _intervalHandle, refreshIntervalMs, refresh } = get();

    if (!enabled) {
      if (_intervalHandle) clearInterval(_intervalHandle);
      set({ autoRefreshEnabled: false, _intervalHandle: null });
      return;
    }

    // Already running — nothing to do
    if (_intervalHandle) {
      set({ autoRefreshEnabled: true });
      return;
    }

    const handle = setInterval(() => {
      void get().refresh();
    }, refreshIntervalMs);

    set({ autoRefreshEnabled: true, _intervalHandle: handle });
  },

  setRefreshInterval: (ms) => {
    const { autoRefreshEnabled, _intervalHandle } = get();

    if (_intervalHandle) clearInterval(_intervalHandle);

    set({ refreshIntervalMs: ms, _intervalHandle: null });

    if (autoRefreshEnabled) {
      get().setAutoRefresh(true);
    }
  },

  loadPersistedSnapshot: async () => {
    try {
      const snapshot = await metricsService.loadLastSnapshot();
      if (snapshot) {
        set({ snapshot });
      }
    } catch (err) {
      logger.warn('metricsStore: could not load persisted snapshot', err);
    }
  },

  init: async () => {
    await metricsService.init();
    await get().loadPersistedSnapshot();
    await get().refresh();
    get().setAutoRefresh(get().autoRefreshEnabled);
  },

  destroy: () => {
    const { _intervalHandle } = get();
    if (_intervalHandle) clearInterval(_intervalHandle);
    set({ _intervalHandle: null });
  },
}));
