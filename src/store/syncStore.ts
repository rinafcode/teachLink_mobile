import { create } from 'zustand';

export interface SyncStatus {
  consecutiveFailureCount: number;
  backoffMs: number;
  circuitOpen: boolean;
}

interface SyncStoreState {
  syncStatus: SyncStatus;
  setSyncStatus: (status: Partial<SyncStatus>) => void;
  recordSyncFailure: (backoffMs: number, circuitOpen?: boolean, failureCount?: number) => void;
  resetSyncStatus: (backoffMs?: number) => void;
  openCircuit: (backoffMs: number, failureCount: number) => void;
}

const INITIAL_SYNC_STATUS: SyncStatus = {
  consecutiveFailureCount: 0,
  backoffMs: 0,
  circuitOpen: false,
};

export const useSyncStore = create<SyncStoreState>(set => ({
  syncStatus: INITIAL_SYNC_STATUS,

  setSyncStatus: status =>
    set(state => ({
      syncStatus: {
        ...state.syncStatus,
        ...status,
      },
    })),

  recordSyncFailure: (backoffMs, circuitOpen = false, failureCount) =>
    set(state => ({
      syncStatus: {
        consecutiveFailureCount: failureCount ?? state.syncStatus.consecutiveFailureCount + 1,
        backoffMs,
        circuitOpen,
      },
    })),

  resetSyncStatus: (backoffMs = 0) =>
    set({
      syncStatus: {
        ...INITIAL_SYNC_STATUS,
        backoffMs,
      },
    }),

  openCircuit: (backoffMs, failureCount) =>
    set({
      syncStatus: {
        consecutiveFailureCount: failureCount,
        backoffMs,
        circuitOpen: true,
      },
    }),
}));

export default useSyncStore;
