import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { UpdateInfo, UpdateStatus } from '../services/updateService';

interface UpdateState {
  // Current update lifecycle status
  status: UpdateStatus;

  // Info about the available update (populated when status === 'available' | 'downloading' | 'ready')
  updateInfo: UpdateInfo | null;

  // Error message when status === 'error'
  error: string | null;

  // Whether the prompt is visible to the user
  isPromptVisible: boolean;

  // ISO timestamp of the last successful check
  lastCheckedAt: string | null;

  // ISO timestamp of the last time the user dismissed the prompt
  // Used to avoid re-prompting too frequently
  lastDismissedAt: string | null;

  // Actions
  setStatus: (status: UpdateStatus) => void;
  setUpdateInfo: (info: UpdateInfo | null) => void;
  setError: (error: string | null) => void;
  showPrompt: () => void;
  hidePrompt: () => void;
  setLastCheckedAt: (ts: string) => void;
  setLastDismissedAt: (ts: string) => void;
  reset: () => void;
}

const INITIAL_STATE = {
  status: 'idle' as UpdateStatus,
  updateInfo: null,
  error: null,
  isPromptVisible: false,
  lastCheckedAt: null,
  lastDismissedAt: null,
};

export const useUpdateStore = create<UpdateState>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,

      setStatus: (status) => set({ status }),
      setUpdateInfo: (updateInfo) => set({ updateInfo }),
      setError: (error) => set({ error }),
      showPrompt: () => set({ isPromptVisible: true }),
      hidePrompt: () => set({ isPromptVisible: false }),
      setLastCheckedAt: (ts) => set({ lastCheckedAt: ts }),
      setLastDismissedAt: (ts) => set({ lastDismissedAt: ts }),
      reset: () => set(INITIAL_STATE),
    }),
    {
      name: 'update-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the timestamps — runtime state is always re-derived on launch
      partialize: (state: UpdateState) => ({
        lastCheckedAt: state.lastCheckedAt,
        lastDismissedAt: state.lastDismissedAt,
      }),
    },
  ),
);
