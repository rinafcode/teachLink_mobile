import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { getAccessToken, getRefreshToken, saveTokens } from "../secureStorage";

// ─── Client ───────────────────────────────────────────────────────────────────

const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ─── Token refresh queue ──────────────────────────────────────────────────────
// Prevents multiple concurrent token refreshes when several requests 401 at once.

let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processRefreshQueue(token: string | null, error: unknown) {
  refreshQueue.forEach(({ resolve, reject }) =>
    token ? resolve(token) : reject(error),
  );
  refreshQueue = [];
}

// ─── Request interceptor — attach Bearer token ────────────────────────────────

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response interceptor — handle 401 / token refresh ───────────────────────

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // ── Log non-network errors in dev ────────────────────────────────────
    if (__DEV__) {
      if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
        console.warn("⚠️ API not available (running in offline mode)");
      } else if (error.response?.status !== 401) {
        console.error("API Error:", error.response?.data || error.message);
      }
    }

    // ── Token refresh on 401 ─────────────────────────────────────────────
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        // Queue this request until the ongoing refresh completes
        return new Promise((resolve, reject) => {
          refreshQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(apiClient(originalRequest));
            },
            reject,
          });
        });
      }

      isRefreshing = true;

      try {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) throw new Error("No refresh token");

        const { data } = await axios.post(
          `${process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000"}/auth/refresh`,
          { refreshToken },
        );

        const { accessToken, refreshToken: newRefresh, expiresAt } = data.tokens;
        await saveTokens(accessToken, newRefresh, expiresAt);

        processRefreshQueue(accessToken, null);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processRefreshQueue(null, refreshError);
        // Let callers handle the auth failure (e.g. navigate to login)
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
