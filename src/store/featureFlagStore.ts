import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  DEFAULT_FLAGS,
  evaluateFlag,
  EvaluationContext,
  fetchRemoteFlags,
  FlagDefinition,
  FlagsResponse,
  getPlatformContext,
} from '../services/featureFlagService';
import { appLogger } from '../utils/logger';

const POLL_INTERVAL_MS = 15 * 60 * 1000;

interface FeatureFlagState {
  flags: FlagsResponse;
  lastFetchedAt: number | null;
  fetchError: string | null;
  isPolling: boolean;
  context: EvaluationContext;

  setContext: (context: Partial<EvaluationContext>) => void;
  isEnabled: (flagKey: string, defaultValue?: boolean) => boolean;
  getDefinition: (flagKey: string) => FlagDefinition | undefined;
  refresh: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
}

function mergeFlags(remote: FlagsResponse | null, persisted: FlagsResponse | null): FlagsResponse {
  const merged: Record<string, FlagDefinition> = {};

  Object.entries(DEFAULT_FLAGS).forEach(([key, def]) => {
    merged[key] = def;
  });

  if (persisted?.flags) {
    Object.entries(persisted.flags).forEach(([key, def]) => {
      merged[key] = def;
    });
  }

  if (remote?.flags) {
    Object.entries(remote.flags).forEach(([key, def]) => {
      merged[key] = def;
    });
  }

  return {
    version: remote?.version || persisted?.version || '0.0.0',
    updatedAt: remote?.updatedAt || persisted?.updatedAt || '',
    flags: merged,
  };
}

let pollTimerId: ReturnType<typeof setInterval> | null = null;

const initialState: FlagsResponse = {
  version: '0.0.0',
  updatedAt: '',
  flags: { ...DEFAULT_FLAGS },
};

export const useFeatureFlagStore = create<FeatureFlagState>()(
  persist(
    (set, get) => {
      const platformContext = getPlatformContext();

      return {
        flags: initialState,
        lastFetchedAt: null,
        fetchError: null,
        isPolling: false,
        context: platformContext,

        setContext: (partial: Partial<EvaluationContext>) => {
          set(state => ({
            context: { ...state.context, ...partial },
          }));
        },

        isEnabled: (flagKey: string, defaultValue = false): boolean => {
          const { flags, context } = get();
          const definition = flags.flags[flagKey];
          if (!definition) return defaultValue;
          return evaluateFlag(flagKey, definition, context);
        },

        getDefinition: (flagKey: string): FlagDefinition | undefined => {
          return get().flags.flags[flagKey];
        },

        refresh: async () => {
          try {
            const remote = await fetchRemoteFlags();
            if (remote) {
              set(state => ({
                flags: mergeFlags(remote, state.flags),
                lastFetchedAt: Date.now(),
                fetchError: null,
              }));
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            set({ fetchError: message });
            appLogger.warnSync(
              'Feature flag refresh failed',
              error instanceof Error ? error : new Error(message)
            );
          }
        },

        startPolling: () => {
          if (pollTimerId !== null) return;

          set({ isPolling: true });

          pollTimerId = setInterval(() => {
            void get().refresh();
          }, POLL_INTERVAL_MS);
        },

        stopPolling: () => {
          if (pollTimerId !== null) {
            clearInterval(pollTimerId);
            pollTimerId = null;
          }
          set({ isPolling: false });
        },
      };
    },
    {
      name: 'feature-flag-store',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: state => ({
        flags: state.flags,
        lastFetchedAt: state.lastFetchedAt,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<FeatureFlagState>;
        return {
          ...current,
          flags: mergeFlags(null, p.flags ?? null),
          lastFetchedAt: p.lastFetchedAt ?? null,
        };
      },
    }
  )
);

/**
 * Bootstrap feature flags on app launch.
 * Fetches remote flags, then starts periodic polling every 15 minutes.
 * Call once from the root component or splash screen.
 */
export async function initializeFeatureFlags(): Promise<void> {
  const store = useFeatureFlagStore.getState();
  await store.refresh();
  store.startPolling();
}
