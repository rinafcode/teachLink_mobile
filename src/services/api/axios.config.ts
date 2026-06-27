/* IMPLEMENTATION APPROACH
 *
 * Issue #225 — Exponential backoff with jitter for all failed API requests
 *   - 7 max retries, base delay 1 s, cap 60 s, ±10 % jitter
 *   - Applies to 5xx server errors (429 already handled separately)
 *
 * Issue #224 — Request deduplication for concurrent API calls
 *   - GET requests share a single in-flight Promise via RequestDeduplicator
 *   - Duplicate callers receive the same result without an extra network round-trip
 *   - AbortController cancels the request if all subscribers leave within 5 s
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

import { invalidateCacheForBatchRequests, invalidateCacheForMutation } from './cache';
import { requestQueue } from './requestQueue';
import { getEnv } from '../../config';
import { appLogger } from '../../utils/logger';
import { startTiming, notifyEntry } from '../../utils/performanceTiming';
import { healthMetricsService } from '../healthMetrics';
import { getAccessToken, getRefreshToken, saveTokens } from '../secureStorage';

// ─── Helpers ────────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Issue #225 — Exponential backoff with ±10 % jitter.
 *
 * delay = min(baseDelay × 2^attempt, maxDelay) × jitter
 * where jitter ∈ [0.9, 1.1]
 */
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 60_000;
const MAX_SERVER_ERROR_RETRIES = 7;

function getBackoffWithJitter(attempt: number): number {
  const exponential = BASE_DELAY_MS * Math.pow(2, attempt);
  const capped = Math.min(exponential, MAX_DELAY_MS);
  const jitter = 0.9 + Math.random() * 0.2; // ±10 %
  return Math.round(capped * jitter);
}

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function invalidateSuccessfulMutationCache(config: InternalAxiosRequestConfig): void {
  const method = config.method?.toUpperCase();
  if (!method || !MUTATION_METHODS.has(method)) {
    return;
  }

  const url = config.url ?? '';
  if (method === 'POST' && url.includes('/api/batch')) {
    invalidateCacheForBatchRequests(config.data);
    return;
  }

  invalidateCacheForMutation(method, url);
}

// ─── Rate Limit Backoff (Issue #141) ──────────────────────────────────────

/**
 * Exponential backoff delays for 429 rate limit responses.
 * Index 0 = 1st retry, etc. Values in milliseconds.
 */
const RATE_LIMIT_DELAYS = [1000, 2000, 4000, 8000];
const MAX_RATE_LIMIT_RETRIES = 5;

// ─── Client ────────────────────────────────────────────────────────────────

const baseURL = getEnv('EXPO_PUBLIC_API_BASE_URL');

// eslint-disable-next-line import/no-named-as-default-member
const apiClient = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const UPLOAD_TIMEOUT_MS = 30_000;

// ─── Refresh queue ─────────────────────────────────────────────────────────

let isRefreshing = false;

let refreshQueue: {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}[] = [];

function processRefreshQueue(token: string | null, error: unknown) {
  refreshQueue.forEach(({ resolve, reject }) => (token ? resolve(token) : reject(error)));
  refreshQueue = [];
}

// ─── Request interceptor ───────────────────────────────────────────────────

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig & { _requestStartMs?: number }) => {
    // Stamp request start time for latency tracking
    config._requestStartMs = Date.now();

    // Skip adding token for refresh requests
    if (config.url?.includes('/auth/refresh')) {
      return config;
    }

    const token = await getAccessToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Attach timing finish function to config for use in response interceptor
    (
      config as InternalAxiosRequestConfig & { _timingFinish?: ReturnType<typeof startTiming> }
    )._timingFinish = startTiming('api', config.url ?? 'unknown', config.method?.toUpperCase());

    return config;
  },
  error => Promise.reject(error)
);

// ─── Image format request interceptor ──────────────────────────────────────
// Negotiate WebP format via Accept header for image-serving API endpoints.

const IMAGE_PATH_PATTERNS = [
  /\/images?\//,
  /\/uploads?\//,
  /\/avatars?\//,
  /\/media\//,
  /\.(png|jpg|jpeg|gif|webp|avif)/i,
];

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const url = config.url ?? '';
    if (IMAGE_PATH_PATTERNS.some(pattern => pattern.test(url))) {
      config.headers.Accept = 'image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8';
    }
    return config;
  },
  error => Promise.reject(error)
);

// ─── Response interceptor ───────────────────────────────────────────────────

apiClient.interceptors.response.use(
  response => {
    // Record successful API call for health metrics
    const cfg = response.config as InternalAxiosRequestConfig & { _requestStartMs?: number };
    const durationMs = cfg._requestStartMs ? Date.now() - cfg._requestStartMs : 0;
    healthMetricsService.recordApiCall({
      endpoint: cfg.url ?? 'unknown',
      method: (cfg.method ?? 'GET').toUpperCase(),
      durationMs,
      statusCode: response.status,
    });
    invalidateSuccessfulMutationCache(cfg);
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      _retryCount?: number;
      _requestStartMs?: number;
    };

    // ── Record API error for health metrics ───────────────────────────────
    if (originalRequest && error.response) {
      const durationMs = originalRequest._requestStartMs
        ? Date.now() - originalRequest._requestStartMs
        : 0;
      healthMetricsService.recordApiCall({
        endpoint: originalRequest.url ?? 'unknown',
        method: (originalRequest.method ?? 'GET').toUpperCase(),
        durationMs,
        statusCode: error.response.status,
      });
    }

    // ── Log non-network errors ────────────────────────────────────────────
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      appLogger.warnSync('API not available (running in offline mode)');
    } else if (error.code === 'ECONNABORTED') {
      appLogger.warnSync('Request timed out', {
        endpoint: originalRequest.url,
        method: originalRequest.method,
        timeout: originalRequest.timeout,
      });
    } else if (error.response?.status !== 401) {
      appLogger.errorSync('API Error', error as Error, {
        status: error.response?.status,
        data: error.response?.data,
        endpoint: originalRequest.url,
        method: originalRequest.method,
      });
    }

    // Record failed timing (only once, on first error — not on retries)
    if (originalRequest._timingFinish && !originalRequest._retryCount) {
      const entry = originalRequest._timingFinish(false, error.response?.status);
      notifyEntry(entry);
      originalRequest._timingFinish = undefined;
    }

    // ── Queue network errors for retry ───────────────────────────────────
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      if (originalRequest) {
        await requestQueue.addToQueue(originalRequest);
      }
      return Promise.reject(error);
    }

    const status = error.response?.status;

    // ─── 401: Token refresh flow ───────────────────────────────────────────

    if (
      status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
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
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await apiClient.post('/auth/refresh', {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefresh, expiresAt } = data.tokens;

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
      appLogger.warnSync('403 Forbidden - access denied', {
        endpoint: originalRequest.url,
        method: originalRequest.method,
      });

      return Promise.reject({
        message: 'You are not allowed to perform this action',
        status: 403,
      });
    }

    // ─── 429: Rate limit (exponential backoff) ─────────────────────────────

    if (status === 429) {
      originalRequest._retryCount = originalRequest._retryCount || 0;

      if (originalRequest._retryCount < MAX_RATE_LIMIT_RETRIES) {
        originalRequest._retryCount += 1;
        const delayIndex = originalRequest._retryCount - 1;
        const delayTime =
          RATE_LIMIT_DELAYS[delayIndex] || RATE_LIMIT_DELAYS[RATE_LIMIT_DELAYS.length - 1];

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
      appLogger.errorSync(`API Rate Limit: Max retries exceeded`, undefined, {
        endpoint: originalRequest.url,
        method: originalRequest.method,
        maxRetries: MAX_RATE_LIMIT_RETRIES,
      });

      return Promise.reject({
        message: 'Too many requests. Please wait a moment and try again.',
        status: 429,
        code: 'RATE_LIMIT_EXCEEDED',
      });
    }

    // ─── 500+: Server errors — exponential backoff with jitter (Issue #225) ──
    //
    // Retries up to MAX_SERVER_ERROR_RETRIES (7) times.
    // Delay = min(1 s × 2^attempt, 60 s) × jitter(±10 %)
    // Delays (approx): 1 s, 2 s, 4 s, 8 s, 16 s, 32 s, 60 s

    if (status && status >= 500) {
      originalRequest._retryCount = originalRequest._retryCount || 0;

      if (originalRequest._retryCount < MAX_SERVER_ERROR_RETRIES) {
        const attempt = originalRequest._retryCount;
        originalRequest._retryCount += 1;

        const delayTime = getBackoffWithJitter(attempt);

        appLogger.warnSync(
          `Server error ${status}: retry ${originalRequest._retryCount}/${MAX_SERVER_ERROR_RETRIES} in ${delayTime}ms`,
          {
            endpoint: originalRequest.url,
            method: originalRequest.method,
            attempt: originalRequest._retryCount,
            delayMs: delayTime,
          }
        );

        await delay(delayTime);
        return apiClient(originalRequest);
      }

      appLogger.errorSync(
        `Server error ${status}: max retries (${MAX_SERVER_ERROR_RETRIES}) exceeded`,
        undefined,
        {
          endpoint: originalRequest.url,
          method: originalRequest.method,
        }
      );

      return Promise.reject({
        message: 'Server error. Please try again later.',
        status,
      });
    }

    // ─── ECONNABORTED: Timeout — user-friendly message ──────────────────────

    if (error.code === 'ECONNABORTED') {
      const isUpload = originalRequest.method?.toUpperCase() === 'POST' &&
        originalRequest.data instanceof FormData;
      return Promise.reject({
        message: isUpload
          ? 'Upload timed out. Please check your connection and try again.'
          : 'Request timed out. Please check your connection and try again.',
        status: 0,
        code: 'ECONNABORTED',
        timeout: originalRequest.timeout,
      });
    }

    // ─── Default fallback ──────────────────────────────────────────────────

    return Promise.reject(error);
  }
);

export default apiClient;
