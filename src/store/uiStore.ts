import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { asyncStorageJSONStorage, createHydrationErrorRecovery } from './persistence';

interface UiState {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

const INITIAL_UI_STATE = {
  theme: 'light' as const,
};

let resetUiStoreAfterHydrationError = () => {};

export const useUiStore = create<UiState>()(
  persist(
    (set): UiState => {
      resetUiStoreAfterHydrationError = () => set(INITIAL_UI_STATE);

      return {
        ...INITIAL_UI_STATE,
        setTheme: theme => set({ theme }),
      };
    },
    {
      name: 'ui-storage',
      storage: asyncStorageJSONStorage,
      onRehydrateStorage: createHydrationErrorRecovery(
        'ui-storage',
        resetUiStoreAfterHydrationError
      ),
    }
  )
);
