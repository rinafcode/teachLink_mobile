import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';

import { createHydrationErrorRecovery, secureStorageJSONStorage, toUnixMs } from './persistence';
import { clearFormCache, getFormCacheStorageKey } from '../services/formCache';
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
  theme: 'light' | 'dark';
  // ── Subscription ──────────────────────────────────────────────────────────
  subscriptionTier: 'free' | 'pro' | 'premium';
  receiptValidationPending: boolean;
  // ── Client-side auth lockout ──────────────────────────────────────────────
  authFailureCount: number;
  authLockedUntil: number | null;
  refreshFailureCount: number;
  setUser: (user: User | null) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setTokens: (accessToken: string, refreshToken: string, expiresAt: number | Date) => void;
  setSessionExpiringSoon: (isExpiringSoon: boolean) => void;
  setAuthLoading: (isAuthLoading: boolean) => void;
  setAuthError: (authError: string | null) => void;
  logout: () => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setSubscriptionTier: (tier: 'free' | 'pro' | 'premium') => void;
  setReceiptValidationPending: (pending: boolean) => void;
  incrementAuthFailure: () => void;
  resetAuthFailures: () => void;
  incrementRefreshFailure: () => void;
  resetRefreshFailures: () => void;
}

const INITIAL_APP_STATE = {
  user: null,
  isAuthenticated: false,
  isAuthLoading: false,
  authError: null,
  accessToken: null,
  refreshToken: null,
  sessionExpiresAt: null,
  sessionExpiringSoon: false,
  theme: 'light' as const,
  isLoading: false,
  error: null,
};

let resetAppStoreAfterHydrationError = () => {};

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      subscribeWithSelector((set, get) => {
        resetAppStoreAfterHydrationError = () =>
          set(INITIAL_APP_STATE, false, 'hydrationErrorReset');

        return {
          ...INITIAL_APP_STATE,
          subscriptionTier: 'free' as const,
          receiptValidationPending: false,
          authFailureCount: 0,
          authLockedUntil: null,
          refreshFailureCount: 0,
          setUser: (user: User | null) => {
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
          setTheme: (theme: 'light' | 'dark') => set({ theme }, false, 'setTheme'),
          setTokens: (accessToken: string, refreshToken: string, sessionExpiresAt: number | Date) =>
            set(
              {
                accessToken,
                refreshToken,
                sessionExpiresAt: toUnixMs(sessionExpiresAt),
              },
              false,
              'setTokens'
            ),
          setSessionExpiringSoon: (sessionExpiringSoon: boolean) =>
            set({ sessionExpiringSoon }, false, 'setSessionExpiringSoon'),
          setAuthLoading: (isAuthLoading: boolean) =>
            set({ isAuthLoading }, false, 'setAuthLoading'),
          setAuthError: (authError: string | null) =>
            set({ authError }, false, 'setAuthError'),
          logout: () => {
            const userId = get().user?.id;
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
                subscriptionTier: 'free',
                receiptValidationPending: false,
                authFailureCount: 0,
                authLockedUntil: null,
                refreshFailureCount: 0,
              },
              false,
              'logout'
            );
            sentryContextService.clearUser();
            sentryContextService.resetSession();
            if (userId) {
              clearFormCache(getFormCacheStorageKey(userId)).catch(() => {});
            }
          },
          setLoading: (isLoading: boolean) => set({ isLoading }, false, 'setLoading'),
          setError: (error: string | null) => set({ error }, false, 'setError'),
          setSubscriptionTier: (tier: 'free' | 'pro' | 'premium') =>
            set({ subscriptionTier: tier }, false, 'setSubscriptionTier'),
          setReceiptValidationPending: (pending: boolean) =>
            set({ receiptValidationPending: pending }, false, 'setReceiptValidationPending'),
          incrementAuthFailure: () =>
            set(
              state => {
                const next = state.authFailureCount + 1;
                if (next >= 5) {
                  return { authFailureCount: 0, authLockedUntil: Date.now() + 30_000 };
                }
                return { authFailureCount: next };
              },
              false,
              'incrementAuthFailure'
            ),
          resetAuthFailures: () =>
            set({ authFailureCount: 0, authLockedUntil: null }, false, 'resetAuthFailures'),
          incrementRefreshFailure: () => {
            const next = get().refreshFailureCount + 1;
            if (next >= 3) {
              get().logout();
              set({ refreshFailureCount: 0 }, false, 'forceLogoutOnRefreshFailure');
            } else {
              set({ refreshFailureCount: next }, false, 'incrementRefreshFailure');
            }
          },
          resetRefreshFailures: () =>
            set({ refreshFailureCount: 0 }, false, 'resetRefreshFailures'),
        };
      }),
      {
        name: 'app-auth-storage',
        storage: secureStorageJSONStorage,
        onRehydrateStorage: createHydrationErrorRecovery(
          'app-auth-storage',
          resetAppStoreAfterHydrationError
        ),
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
          authLockedUntil: state.authLockedUntil,
        }),
        merge: (persistedState, currentState) => {
          const hydratedState = (persistedState ?? {}) as Partial<AppState>;

          return {
            ...currentState,
            ...hydratedState,
            sessionExpiresAt: toUnixMs(hydratedState.sessionExpiresAt),
            authLockedUntil: hydratedState.authLockedUntil ?? null,
          };
        },
      }
    ),
    { name: 'AppStore' }
  )
);

export * from './courseProgressStore';
export * from './deviceStore';
export * from './metricsStore';
export * from './notificationStore';
export * from './reviewStore';
export * from './selectors';
export * from './socketStore';
export * from './syncStore';
