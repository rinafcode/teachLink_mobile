import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { createJSONStorage, devtools, persist, subscribeWithSelector } from 'zustand/middleware';

import type { StateStorage } from 'zustand/middleware';
import { toUnixMs } from './persistence';
import { sentryContextService } from '../services/sentryContext';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role?: string;
}

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  authError: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  sessionExpiresAt: number | null;
  sessionExpiringSoon: boolean;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setTokens: (accessToken: string, refreshToken: string, expiresAt: number | Date) => void;
  setSessionExpiringSoon: (isExpiringSoon: boolean) => void;
  setAuthLoading: (isAuthLoading: boolean) => void;
  setAuthError: (authError: string | null) => void;
  logout: () => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

/**
 * Zustand-compatible StateStorage adapter backed by expo-secure-store.
 * Values are serialised as JSON strings since SecureStore only handles strings.
 */
const secureStorageAdapter: StateStorage = {
  getItem: async (name: string) => {
    const value = await SecureStore.getItemAsync(name);
    return value ?? null;
  },
  setItem: async (name: string, value: string) => {
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name: string) => {
    await SecureStore.deleteItemAsync(name);
  },
};

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      subscribeWithSelector(set => ({
        user: null,
        isAuthenticated: false,
        isAuthLoading: false,
        authError: null,
        accessToken: null,
        refreshToken: null,
        sessionExpiresAt: null,
        sessionExpiringSoon: false,
        isLoading: false,
        error: null,
        setUser: (user) => {
          set({ user, isAuthenticated: !!user }, false, 'setUser');
          // Sync Sentry scope with the signed-in user so every subsequent
          // error report is automatically tagged with user identity.
          if (user) {
            sentryContextService.setUser({
              id: user.id,
              email: user.email,
              username: user.name,
              role: user.role,
            });
          } else {
            sentryContextService.clearUser();
          }
        },
        setTheme: (theme) => set({ theme }, false, 'setTheme'),
        setTokens: (accessToken, refreshToken, sessionExpiresAt) =>
          set(
            {
              accessToken,
              refreshToken,
              sessionExpiresAt: toUnixMs(sessionExpiresAt),
            },
            false,
            'setTokens'
          ),
        setSessionExpiringSoon: sessionExpiringSoon =>
          set({ sessionExpiringSoon }, false, 'setSessionExpiringSoon'),
        setAuthLoading: (isAuthLoading) => set({ isAuthLoading }, false, 'setAuthLoading'),
        setAuthError: (authError) => set({ authError }, false, 'setAuthError'),
        logout: () => {
          set(
            {
              user: null,
              isAuthenticated: false,
              isAuthLoading: false,
              authError: null,
              accessToken: null,
              refreshToken: null,
              sessionExpiresAt: null,
              sessionExpiringSoon: false,
            },
            false,
            'logout'
          );
          // Clear Sentry user scope and reset breadcrumb trail on logout
          sentryContextService.clearUser();
          sentryContextService.resetSession();
        },
        setLoading: (isLoading) => set({ isLoading }, false, 'setLoading'),
        setError: (error) => set({ error }, false, 'setError'),
      })),
      {
        name: 'app-auth-storage',
        storage: createJSONStorage(() => secureStorageAdapter),
        /**
         * Only persist auth-related and UI preference state.
         * Transient flags (isLoading, isAuthLoading, error, authError)
         * are intentionally excluded — they should always start fresh.
         */
        partialize: state => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
          sessionExpiresAt: toUnixMs(state.sessionExpiresAt),
          theme: state.theme,
        }),
        merge: (persistedState, currentState) => {
          const hydratedState = (persistedState ?? {}) as Partial<AppState>;

          return {
            ...currentState,
            ...hydratedState,
            sessionExpiresAt: toUnixMs(hydratedState.sessionExpiresAt),
          };
        },
      }
    ),
    { name: 'AppStore' }
  )
);

export * from './courseProgressStore';
export * from './metricsStore';
export * from './notificationStore';
export * from './reviewStore';
export * from './selectors';

