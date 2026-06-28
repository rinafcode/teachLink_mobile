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

import { getEnv } from '../../config';
import { MUTATION_INVALIDATION_MAP } from '../../config/apiCacheConfig';
import { SSL_PINNING } from '../../config/security';
import { useAppStore } from '../../store';
import { useConflictStore, type ConflictData } from '../../store/conflictStore';
import { appLogger } from '../../utils/logger';
import { notifyEntry, startTiming } from '../../utils/performanceTiming';
import { healthMetricsService } from '../healthMetrics';
import { getAccessToken, getRefreshToken, saveTokens } from '../secureStorage';
import { sentryContextService } from '../sentryContext';
import {
  invalidateByPattern,
  invalidateCacheForBatchRequests,
  invalidateCacheForMutation,
} from './cache';
import { requestQueue } from './requestQueue';

// ─── Helpers ────────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Returns true when a network-layer error is consistent with an SSL certificate
 * pin validation failure rather than a routine connectivity loss.
 *
 * Platform manifestations:
 *   iOS  — NSURLErrorSecureConnectionFailed (-1200), NSURLErrorServerCertificateUntrusted (-1202)
 *   Android — javax.net.ssl.SSLHandshakeException / SSLPeerUnverifiedException
 *
 * These surface in JavaScript as ERR_NETWORK / "Network Error" with SSL keywords
 * in the underlying cause or message. We check both so a future RN version that
 * exposes more detail is covered automatically.
 */
function isCertPinFailure(error: AxiosError): boolean {
  if (SSL_PINNING.bypassEnabled) return false;
  const msg = (error.message ?? '').toLowerCase();
  const cause = String((error as unknown as { cause?: unknown }).cause ?? '').toLowerCase();
  return (
    msg.includes('ssl') ||
    msg.includes('certificate') ||
    msg.includes('tls') ||
    cause.includes('sslhandshakeexception') ||
    cause.includes('sslpeerunverifiedexception') ||
    cause.includes('certificateexpired') ||
    cause.includes('nsurlErrorSecureConnectionFailed'.toLowerCase()) ||
    cause.includes('nsurlErrorServerCertificateUntrusted'.toLowerCase())
  );
}

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

  // Pattern-based invalidation from config map
  for (const rule of MUTATION_INVALIDATION_MAP) {
    if (rule.methods.includes(method) && rule.urlPattern.test(url)) {
      for (const pattern of rule.invalidatePatterns) {
        invalidateByPattern(pattern);
      }
      return;
    }
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
    const requestId = uuidv4();
    config.headers['X-Request-ID'] = requestId;
    pushLogContext({ requestId });

    // Stamp request start time for latency tracking
    config._requestStartMs = Date.now();

    // Skip adding token for refresh requests
    if (config.url?.includes('/auth/refresh')) {
      return config;
    }

    // Hard-block any authenticated request when the session has already expired.
    // The foreground check in App.tsx handles proactive refresh; this is the
    // safety net for requests that slip through while the app is in use.
    const { isAuthenticated, sessionExpiresAt } = useAppStore.getState();
    if (isAuthenticated && sessionExpiresAt !== null && Date.now() >= sessionExpiresAt) {
      useAppStore.getState().logout();
      return Promise.reject({
        message: 'Session expired. Please log in again.',
        code: 'SESSION_EXPIRED',
        status: 401,
      });
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
    const sentRequestId = response.config.headers['X-Request-ID'];
    const receivedRequestId = response.headers['x-request-id'];

    if (sentRequestId && receivedRequestId && sentRequestId !== receivedRequestId) {
      appLogger.warnSync('Request ID mismatch', { sent: sentRequestId, received: receivedRequestId });
    }

    popLogContext();

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

    // Successful login clears the client-side lockout counter
    if (cfg.url?.includes('/auth/login')) {
      useAppStore.getState().resetAuthFailures();
    }

    return response;
  },
  async (error: AxiosError) => {
    popLogContext();

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

    // ── SSL pin failure — force logout, report to Sentry, surface clean error ─
    //
    // Platform-level pinning (NSPinnedDomains / network_security_config) raises
    // SSL errors that reach JS as network-layer failures. Detect them before the
    // general ERR_NETWORK retry path so we never silently retry a MITM'd request.
    if (
      (error.code === 'ERR_NETWORK' || error.message === 'Network Error') &&
      isCertPinFailure(error)
    ) {
      // Report to Sentry — endpoint and method only; no token, headers, or body
      sentryContextService.captureException(new Error('SSL certificate pin validation failed'), {
        tags: { 'security.event': 'ssl_pin_failure' },
        extra: {
          endpoint: originalRequest?.url,
          method: originalRequest?.method?.toUpperCase(),
        },
        fingerprint: ['ssl-pin-failure'],
      });

      appLogger.errorSync('SSL pin validation failed — possible MITM attack', undefined, {
        endpoint: originalRequest?.url,
        method: originalRequest?.method,
      });

      // Force full logout — session may be compromised
      useAppStore.getState().logout();

      return Promise.reject({
        message:
          'Secure connection could not be established. Please check your network and try again.',
        code: 'SSL_PIN_FAILURE',
        status: 0,
      });
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

    // Count consecutive bad-credential 401s on the login endpoint so the
    // client can enforce a lockout before the 5th attempt reaches the server.
    if (status === 401 && originalRequest.url?.includes('/auth/login') && !originalRequest._retry) {
      useAppStore.getState().incrementAuthFailure();
    }

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
        // Three consecutive refresh 401s indicate the refresh token is invalid;
        // force a full logout rather than leaving the user in a broken auth state.
        if ((refreshError as AxiosError)?.response?.status === 401) {
          useAppStore.getState().incrementRefreshFailure();
        }
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

    // ─── 409: Conflict — offline mutation conflicts with server state ─────
    //
    // Server returns 409 when the client's lastKnownVersion is behind the
    // server's current version. The response body contains:
    // - serverVersion: the current server data
    // - serverVersionNumber: the current version number
    // - localVersion: echoed back from client headers (if provided)
    // - entityType: type of entity (note, quiz, profile, etc.)
    // - entityId: identifier of the conflicting entity

    if (status === 409) {
      const responseData = error.response?.data as
        | {
            serverVersion?: unknown;
            serverVersionNumber?: number;
            localVersion?: unknown;
            entityType?: string;
            entityId?: string;
            message?: string;
          }
        | undefined;

      // Extract version metadata from request headers
      const clientVersionHeader = originalRequest.headers?.['X-Last-Known-Version'];
      const clientTimestampHeader = originalRequest.headers?.['X-Client-Timestamp'];
      const entityTypeHeader = originalRequest.headers?.['X-Entity-Type'];
      const entityIdHeader = originalRequest.headers?.['X-Entity-Id'];

      const conflictData: ConflictData = {
        id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        entityId: responseData?.entityId ?? String(entityIdHeader ?? ''),
        entityType: responseData?.entityType ?? String(entityTypeHeader ?? 'unknown'),
        localData: originalRequest.data,
        serverData: responseData?.serverVersion,
        localVersion: clientVersionHeader ? Number(clientVersionHeader) : undefined,
        serverVersion: responseData?.serverVersionNumber,
        clientTimestamp: clientTimestampHeader ? Number(clientTimestampHeader) : Date.now(),
        serverTimestamp: Date.now(),
        endpoint: originalRequest.url ?? '',
        method: (originalRequest.method ?? 'UNKNOWN').toUpperCase(),
        detectedAt: Date.now(),
      };

      appLogger.warnSync('409 Conflict - mutation conflicts with server state', {
        endpoint: originalRequest.url,
        method: originalRequest.method,
        entityType: conflictData.entityType,
        entityId: conflictData.entityId,
        localVersion: conflictData.localVersion,
        serverVersion: conflictData.serverVersion,
      });

      // Add to conflict store for UI resolution
      useConflictStore.getState().addConflict(conflictData);

      return Promise.reject({
        message: responseData?.message ?? 'Your changes conflict with newer server data',
        status: 409,
        code: 'CONFLICT',
        conflict: conflictData,
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
      const isUpload =
        originalRequest.method?.toUpperCase() === 'POST' &&
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