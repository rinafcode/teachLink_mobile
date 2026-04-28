/* IMPLEMENTATION APPROACH for #141 - Rate Limit Handling + Exponential Backoff
 *
 * RECON FINDINGS:
 * - Current axios instance: apiClient with baseURL from env, timeout 10000ms
 * - Existing request interceptor: YES - adds Bearer token from secure storage
 * - Existing response interceptor: YES - handles 401 (refresh), 403 (forbidden), 429 (rate limit), 500+ (server errors)
 * - Current 429 implementation: 3 retries max with exponential backoff (max 10s delay)
 * - Axios version: ^1.13.2 from package.json
 * - Error UX: logger utility (logger.error, logger.warn) - no toast library
 * - TypeScript: strict mode enabled, using InternalAxiosRequestConfig, AxiosError types
 * - Testing: Jest with jest-expo preset
 * - CI checks: lint, typecheck (tsc --noEmit), jest tests
 *
 * STRATEGY:
 * 1. Extend 429 retry from 3 to 5 retries
 * 2. Use explicit backoff delays: 1000ms, 2000ms, 4000ms, 8000ms (total 15s max)
 * 3. Add user feedback via logger during backoff (non-intrusive, mobile-appropriate)
 * 4. Ensure no infinite retry loops with hard 5-retry limit
 * 5. Preserve ALL existing error handling for non-429 errors
 * 6. Keep existing 401 refresh flow and 500+ retry logic untouched
 *
 * MAX RETRY DELAYS: [1000, 2000, 4000, 8000]ms → total 15s max backoff
 * USER FEEDBACK: logger.warn() for retry attempts, logger.error() for final failure
 * RETRY TRACKING: _retryCount header on original request config
 *
 * FILES CHANGED: src/services/api/axios.config.ts ONLY
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { getEnv } from "../../config";
import { appLogger } from "../../utils/logger";
import { getAccessToken, getRefreshToken, saveTokens } from "../secureStorage";
import { requestQueue } from "./requestQueue";

// ─── Helpers ────────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getBackoffTime = (retryCount: number) =>
  Math.min(1000 * 2 ** retryCount, 10000);

// ─── Rate Limit Backoff (Issue #141) ──────────────────────────────────────

/**
 * Exponential backoff delays for 429 rate limit responses.
 * Index 0 = 1st retry, etc. Values in milliseconds.
 */
const RATE_LIMIT_DELAYS = [1000, 2000, 4000, 8000];
const MAX_RATE_LIMIT_RETRIES = 5;

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
      appLogger.warnSync("API not available (running in offline mode)");
    } else if (error.response?.status !== 401) {
      appLogger.errorSync("API Error", error as Error, {
        status: error.response?.status,
        data: error.response?.data,
        endpoint: originalRequest.url,
        method: originalRequest.method,
      });
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
      appLogger.warnSync("403 Forbidden - access denied", {
        endpoint: originalRequest.url,
        method: originalRequest.method,
      });

      return Promise.reject({
        message: "You are not allowed to perform this action",
        status: 403,
      });
    }

    // ─── 429: Rate limit (exponential backoff) ─────────────────────────────

    if (status === 429) {
      originalRequest._retryCount = originalRequest._retryCount || 0;

      if (originalRequest._retryCount < MAX_RATE_LIMIT_RETRIES) {
        originalRequest._retryCount += 1;
        const delayIndex = originalRequest._retryCount - 1;
        const delayTime = RATE_LIMIT_DELAYS[delayIndex] || RATE_LIMIT_DELAYS[RATE_LIMIT_DELAYS.length - 1];

        // User feedback: Log retry attempt with countdown
        appLogger.warnSync(
          `API Rate Limit: Retry ${originalRequest._retryCount}/${MAX_RATE_LIMIT_RETRIES}`,
          {
            endpoint: originalRequest.url,
            method: originalRequest.method,
            delayMs: delayTime,
            retryCount: originalRequest._retryCount,
          }
        );

        await delay(delayTime);

        return apiClient(originalRequest);
      }

      // Max retries exceeded - user-facing error
      appLogger.errorSync(
        `API Rate Limit: Max retries exceeded`,
        undefined,
        {
          endpoint: originalRequest.url,
          method: originalRequest.method,
          maxRetries: MAX_RATE_LIMIT_RETRIES,
        }
      );

      return Promise.reject({
        message: "Too many requests. Please wait a moment and try again.",
        status: 429,
        code: "RATE_LIMIT_EXCEEDED",
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
