import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";

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

export const useAppStore = create<AppState>()(
  devtools(
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
    { name: "AppStore" }
  )
);

export * from "./notificationStore";
