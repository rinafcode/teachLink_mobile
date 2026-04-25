import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { createJSONStorage, devtools, persist, subscribeWithSelector } from "zustand/middleware";

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
  theme: "light" | "dark";
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setTheme: (theme: "light" | "dark") => void;
  setTokens: (accessToken: string, refreshToken: string, expiresAt: number) => void;
  setAuthLoading: (loading: boolean) => void;
  setAuthError: (error: string | null) => void;
  logout: () => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

/**
 * Custom storage adapter backed by expo-secure-store.
 * Secure store only supports string values and has a 2KB per-key limit,
 * so we serialise the entire persisted slice as a single JSON string.
 */
const secureStorage = createJSONStorage(() => ({
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Silently fail — store will fall back to in-memory state
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Silently fail
    }
  },
}));

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      subscribeWithSelector((set) => ({
        user: null,
        isAuthenticated: false,
        isAuthLoading: false,
        authError: null,
        accessToken: null,
        refreshToken: null,
        sessionExpiresAt: null,
        theme: "light",
        isLoading: false,
        error: null,
        setUser: (user) => set({ user, isAuthenticated: !!user }, false, "setUser"),
        setTheme: (theme) => set({ theme }, false, "setTheme"),
        setTokens: (accessToken, refreshToken, sessionExpiresAt) =>
          set({ accessToken, refreshToken, sessionExpiresAt }, false, "setTokens"),
        setAuthLoading: (isAuthLoading) => set({ isAuthLoading }, false, "setAuthLoading"),
        setAuthError: (authError) => set({ authError }, false, "setAuthError"),
        logout: () =>
          set(
            {
              user: null,
              isAuthenticated: false,
              isAuthLoading: false,
              authError: null,
              accessToken: null,
              refreshToken: null,
              sessionExpiresAt: null,
            },
            false,
            "logout"
          ),
        setLoading: (isLoading) => set({ isLoading }, false, "setLoading"),
        setError: (error) => set({ error }, false, "setError"),
      })),
      {
        name: "app-auth-storage",
        storage: secureStorage,
        /**
         * Only persist auth-related and UI preference state.
         * Transient flags (isLoading, isAuthLoading, error, authError)
         * are intentionally excluded — they should always start fresh.
         */
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
          sessionExpiresAt: state.sessionExpiresAt,
          theme: state.theme,
        }),
      }
    ),
    { name: "AppStore" }
  )
);

export * from "./notificationStore";
