import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { getEnv } from "../../config";
import logger from "../../utils/logger";
import { getAccessToken, getRefreshToken, saveTokens } from "../secureStorage";
import { requestQueue } from "./requestQueue";

// ─── Helpers ────────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getBackoffTime = (retryCount: number) =>
  Math.min(1000 * 2 ** retryCount, 10000);

// ─── Client ────────────────────────────────────────────────────────────────

const baseURL = getEnv("EXPO_PUBLIC_API_BASE_URL");

const apiClient = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ─── Refresh queue ─────────────────────────────────────────────────────────

let isRefreshing = false;

let refreshQueue: {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}[] = [];

function processRefreshQueue(token: string | null, error: unknown) {
  refreshQueue.forEach(({ resolve, reject }) =>
    token ? resolve(token) : reject(error),
  );
  refreshQueue = [];
}

// ─── Request interceptor ───────────────────────────────────────────────────

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

// ─── Response interceptor ───────────────────────────────────────────────────

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      _retryCount?: number;
    };

    // ── Log non-network errors ────────────────────────────────────────────
    if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
      logger.warn("API not available (running in offline mode)");
    } else if (error.response?.status !== 401) {
      logger.error("API Error:", error.response?.data || error.message);
    }

    // ── Queue network errors for retry ───────────────────────────────────
    if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
      if (originalRequest) {
        await requestQueue.addToQueue(originalRequest);
      }
      return Promise.reject(error);
    }

    const status = error.response?.status;

    // ─── 401: Token refresh flow ───────────────────────────────────────────

    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
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

        const { data } = await axios.post(`${baseURL}/auth/refresh`, {
          refreshToken,
        });

        const {
          accessToken,
          refreshToken: newRefresh,
          expiresAt,
        } = data.tokens;

        await saveTokens(accessToken, newRefresh, expiresAt);

        processRefreshQueue(accessToken, null);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        return apiClient(originalRequest);
      } catch (refreshError) {
        processRefreshQueue(null, refreshError);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // ─── 403: Forbidden ────────────────────────────────────────────────────

    if (status === 403) {
      console.warn("403 Forbidden - access denied");

      return Promise.reject({
        message: "You are not allowed to perform this action",
        status: 403,
      });
    }

    // ─── 429: Rate limit (exponential backoff) ─────────────────────────────

    if (status === 429) {
      originalRequest._retryCount = originalRequest._retryCount || 0;

      if (originalRequest._retryCount < 3) {
        originalRequest._retryCount += 1;

        const delayTime = getBackoffTime(originalRequest._retryCount);

        await delay(delayTime);

        return apiClient(originalRequest);
      }

      return Promise.reject({
        message: "Too many requests. Try again later.",
        status: 429,
      });
    }

    // ─── 500+: Server errors (retry limited) ───────────────────────────────

    if (status && status >= 500) {
      originalRequest._retryCount = originalRequest._retryCount || 0;

      if (originalRequest._retryCount < 2) {
        originalRequest._retryCount += 1;

        const delayTime = getBackoffTime(originalRequest._retryCount);

        await delay(delayTime);

        return apiClient(originalRequest);
      }

      return Promise.reject({
        message: "Server error. Please try again later.",
        status,
      });
    }

    // ─── Default fallback ──────────────────────────────────────────────────

    return Promise.reject(error);
  },
);

export default apiClient;
