/**
 * Granular selector hooks for useAppStore.
 *
 * Rules:
 *  - Each hook subscribes to exactly one state field.
 *  - Components must import from here, never call useAppStore() bare for reads.
 *  - Action selectors use `shallow` so object identity is stable across renders.
 *  - Adding a new selector here is the ONLY change needed to add a new consumer.
 */
import { useAppStore } from './index';

// ─── State Selectors ─────────────────────────────────────────────────────────
// Each of these re-renders the consumer ONLY when its specific field changes.

/** Current UI theme. Re-renders only when theme toggles. */
export const useTheme = () => useAppStore(state => state.theme);

/** Authenticated user object. Re-renders only when user identity changes. */
export const useUser = () => useAppStore(state => state.user);

/** Whether the user has an active session. */
export const useIsAuthenticated = () => useAppStore(state => state.isAuthenticated);

/** Whether an auth operation (login/logout/restore) is in flight. */
export const useIsAuthLoading = () => useAppStore(state => state.isAuthLoading);

/** Current auth error message, if any. */
export const useAuthError = () => useAppStore(state => state.authError);

/** Whether the session is about to expire (triggers refresh warning UI). */
export const useSessionExpiringSoon = () => useAppStore(state => state.sessionExpiringSoon);

/** Global loading flag (non-auth operations). */
export const useIsLoading = () => useAppStore(state => state.isLoading);

/** Global error message (non-auth operations). */
export const useError = () => useAppStore(state => state.error);

// ─── Action Selector ─────────────────────────────────────────────────────────
// Actions are defined once at store creation — their references are stable.
// `shallow` prevents a re-render when unrelated state fields change while
// still returning a fresh object reference only when the actions themselves
// change (which in practice never happens).

/**
 * Returns all store action dispatchers as a stable object.
 * Safe to destructure — shallow equality prevents spurious re-renders.
 *
 * @example
 * const { setTheme, logout } = useAppActions();
 */
export const useAppActions = () =>
  useAppStore(state => ({
    setUser: state.setUser,
    setTheme: state.setTheme,
    setTokens: state.setTokens,
    logout: state.logout,
    setAuthLoading: state.setAuthLoading,
    setAuthError: state.setAuthError,
    setSessionExpiringSoon: state.setSessionExpiringSoon,
    setLoading: state.setLoading,
    setError: state.setError,
  }));
