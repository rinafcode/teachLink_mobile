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
import * as Crypto from 'expo-crypto';

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
import { buildSanitizedApiError } from './errorSanitization';
import { requestQueue } from './requestQueue';

/**
 * #806: Runtime shape validator for 409 conflict response bodies.
 *
 * Axios casts response.data to `ConflictData` at the TypeScript level, but
 * provides no runtime guarantee. If the server changes its response format the
 * cast silently yields `undefined` field accesses instead of a clear error.
 * This guard validates the minimum structure before we read any field.
 */
function isConflictResponseShape(data: unknown): data is {
  serverVersion?: unknown;
  serverVersionNumber?: number;
  localVersion?: unknown;
  entityType?: string;
  entityId?: string;
  message?: string;
} {
  return data !== null && data !== undefined && typeof data === 'object';
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Parses a Retry-After header value (seconds or HTTP-date) into milliseconds.
 * Returns undefined if the value cannot be parsed.
 */
function parseRetryAfterMs(retryAfter: unknown): number | undefined {
  if (typeof retryAfter !== 'string') return undefined;
  const trimmed = retryAfter.trim();
  const asNumber = Number(trimmed);
  if (!Number.isNaN(asNumber) && asNumber >= 0) {
    return Math.floor(asNumber * 1000);
  }
  const parsedDate = Date.parse(trimmed);
  if (!Number.isNaN(parsedDate)) {
    const ms = parsedDate - Date.now();
    return ms > 0 ? Math.floor(ms) : undefined;
  }
  return undefined;
}

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
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'PUT', 'DELETE']);
const RETRY_DEADLINE_MS = 30_000; // Overall deadline for all retries

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

// ─── Batched cache statistics (#811) ──────────────────────────────────────────
//
// Cache.ts maintains the authoritative hit/miss counters via recordHit/recordMiss.
// This module reads those counters on a 60-second interval and logs a summary,
// avoiding duplicate counter implementations.

import { getCacheStats } from './cache';

const CACHE_STATS_INTERVAL_MS = 60_000;

function flushCacheStats(): void {
  const stats = getCacheStats();
  const { hits, misses } = stats;
  const total = hits + misses;
  if (total === 0) return;
  const hitRate = ((hits / total) * 100).toFixed(1);
  appLogger.infoSync(
    `[CacheStats] ${hitRate}% hit rate over last 60 s (${hits}/${total} requests served from cache)`,
    { cacheHits: hits, cacheMisses: misses, hitRatePct: parseFloat(hitRate) }
  );
}

/** Flush immediately (e.g. on app background). */
export const flushCacheStatsNow = flushCacheStats;

let _cacheStatsInterval: ReturnType<typeof setInterval> | null = null;

/** Start the periodic cache-stats flush interval. Idempotent. */
export function startCacheStatsFlush(): void {
  if (_cacheStatsInterval !== null) return;
  _cacheStatsInterval = setInterval(flushCacheStats, CACHE_STATS_INTERVAL_MS);
}

/** Stop the periodic cache-stats flush interval and flush remaining stats. */
export function stopCacheStatsFlush(): void {
  if (_cacheStatsInterval === null) return;
  clearInterval(_cacheStatsInterval);
  _cacheStatsInterval = null;
  flushCacheStats();
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

// ─── Refresh queue (Issue #673 — race condition deduplication) ─────────────────
// When multiple concurrent 401 responses arrive simultaneously, only the first
// triggers a token refresh. Subsequent callers await the same in-flight promise
// via this queue, preventing double-refresh that would invalidate the session.

let isRefreshing = false;
let refreshStartTime = 0;

const MAX_QUEUE_SIZE = 50;

let refreshQueue: {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}[] = [];

export function clearRefreshQueue(error?: Error) {
  const err = error || new Error('Session cleared during token refresh.');
  processRefreshQueue(null, err);
}

function processRefreshQueue(token: string | null, error: unknown) {
  refreshQueue.forEach(({ resolve, reject }) => (token ? resolve(token) : reject(error)));
  refreshQueue = [];
}

// ─── Request ID generation ──────────────────────────────────────────────────
// One native crypto call per session; derive per-request IDs from a counter.

let _sessionRequestId = '';
let _requestCounter = 0;

function initSessionRequestId(): void {
  _sessionRequestId = Crypto.randomUUID();
  _requestCounter = 0;
}

function nextRequestId(): string {
  if (!_sessionRequestId) initSessionRequestId();
  return `${_sessionRequestId}-${++_requestCounter}`;
}

// ─── Request interceptor ───────────────────────────────────────────────────

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig & { _requestStartMs?: number }) => {
    const requestId = nextRequestId();
    config.headers['X-Request-ID'] = requestId;
    pushLogContext({ requestId });

    // Stamp request start time for latency tracking
    config._requestStartMs = Date.now();

    // Skip adding token for refresh requests
    if (config.url?.includes('/auth/refresh')) {
      return config;
    }

    // Generate Idempotency-Key for POST requests to prevent duplicate writes on retry
    if (config.method?.toUpperCase() === 'POST' && !config.headers?.['Idempotency-Key']) {
      config.headers['Idempotency-Key'] = Crypto.randomUUID();
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
    // Only call startTiming when _timingFinish is not already set to avoid
    // leaking finalisers on retried requests.
    if (!config._timingFinish) {
      config._timingFinish = startTiming('api', config.url ?? 'unknown', config.method?.toUpperCase());
    }

    return config;
  },
  error => Promise.reject(error)
);

// ─── Image format request interceptor ──────────────────────────────────────
// Short-circuit: cheap substring check before any regex evaluation.
// Only matches image-serving endpoints; folded into the main interceptor.

const IMAGE_ACCEPT_HEADER = 'image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8';

const IMAGE_PATH_PREFIXES = ['/images', '/image', '/uploads', '/upload', '/avatars', '/avatar', '/media'];

function looksLikeImageUrl(url: string): boolean {
  if (!IMAGE_PATH_PREFIXES.some(p => url.includes(p))) return false;
  return /\.(png|jpg|jpeg|gif|webp|avif)(\?|$)/i.test(url);
}

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const url = config.url ?? '';
    if (looksLikeImageUrl(url)) {
      config.headers.Accept = IMAGE_ACCEPT_HEADER;
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
      appLogger.warnSync('Request ID mismatch', {
        sent: sentRequestId,
        received: receivedRequestId,
      });
    }

    popLogContext();

    // Record successful API call for health metrics
    const cfg = response.config as InternalAxiosRequestConfig & {
      _requestStartMs?: number;
      _timingFinish?: ReturnType<typeof startTiming>;
    };
    const durationMs = cfg._requestStartMs ? Date.now() - cfg._requestStartMs : 0;
    healthMetricsService.recordApiCall({
      endpoint: cfg.url ?? 'unknown',
      method: (cfg.method ?? 'GET').toUpperCase(),
      durationMs,
      statusCode: response.status,
    });
    invalidateSuccessfulMutationCache(cfg);

    // Record timing on success — exactly once per logical request
    if (cfg._timingFinish) {
      const entry = cfg._timingFinish(true, response.status);
      entry.retryCount = cfg._retryCount ?? 0;
      notifyEntry(entry);
      cfg._timingFinish = undefined;
    }

    // Successful login resets the client-side auth-failure counter.
    // This is a UX affordance only; the actual security boundary is server-side
    // rate limiting on /auth/login (per account and per IP).
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
      _retryDeadlineAt?: number;
      _requestStartMs?: number;
      _timingFinish?: ReturnType<typeof startTiming>;
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
      const requestUrl = originalRequest?.url ?? '';
      const authApiDomain = new URL(baseURL).hostname;
      const requestDomain = requestUrl ? new URL(requestUrl, baseURL).hostname : '';
      // Report to Sentry — endpoint and method only; no token, headers, or body
      sentryContextService.captureException(new Error('SSL certificate pin validation failed'), {
        tags: { 'security.event': 'ssl_pin_failure' },
        extra: {
          endpoint: originalRequest?.url,
          method: originalRequest?.method?.toUpperCase(),
          isAuthDomain: requestDomain === authApiDomain,
        },
        fingerprint: ['ssl-pin-failure', requestDomain],
      });

      appLogger.errorSync('SSL pin validation failed — possible MITM attack', undefined, {
        endpoint: originalRequest?.url,
        method: originalRequest?.method,
        isAuthDomain: requestDomain === authApiDomain,
      });

      if (requestDomain === authApiDomain) {
        // Force full logout — session may be compromised
        useAppStore.getState().logout();

        return Promise.reject({
          message: 'A security error occurred. Please log in again.',
          code: 'SSL_PIN_FAILURE',
        });
      } else {
        // For non-auth domains, cancel the request and show a security warning
        return Promise.reject({
          message: 'A security error occurred with a third-party service. Please try again later.',
          code: 'SSL_PIN_FAILURE_NON_AUTH',
        });
      }
    }

    // ── Queue network errors for retry ───────────────────────────────────
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      if (originalRequest) {
        const method = originalRequest.method?.toUpperCase();
        const isIdempotent = method === undefined || IDEMPOTENT_METHODS.has(method);
        const hasIdempotencyKey = Boolean(originalRequest.headers?.['Idempotency-Key']);

        // Only queue idempotent methods or mutations with an idempotency key
        if (isIdempotent || hasIdempotencyKey) {
          await requestQueue.addToQueue(originalRequest);
        } else {
          appLogger.warnSync('Network error on non-idempotent request — not queueing to prevent duplicate writes', {
            endpoint: originalRequest.url,
            method: originalRequest.method,
          });
        }
      }
      return Promise.reject(error);
    }

    const status = error.response?.status;

    // ─── 401: Token refresh flow ───────────────────────────────────────────

    // Track consecutive bad-credential 401s on the login endpoint so the
    // client can surface a UX lockout countdown. This is NOT a security control;
    // an attacker can bypass it by clearing storage or calling the API directly.
    // The real protection is server-side rate limiting per account and per IP.
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
          if (refreshQueue.length >= MAX_QUEUE_SIZE) {
            const overflowError = new Error('Session expired due to refresh queue overflow.');
            const elapsedMs = refreshStartTime ? Date.now() - refreshStartTime : 0;

            sentryContextService.captureException(overflowError, {
              tags: { 'auth.refresh_queue_overflow': 'true' },
              extra: {
                queueDepth: refreshQueue.length,
                elapsedRefreshMs: elapsedMs,
              },
            });

            useAppStore.getState().setSessionExpiredModalVisible(true);
            useAppStore.getState().logout();

            processRefreshQueue(null, overflowError);

            return reject(overflowError);
          }
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
      refreshStartTime = Date.now();

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
        refreshStartTime = 0;
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
      // #806: validate response shape at runtime before accessing fields.
      const rawData = error.response?.data;
      const responseData = isConflictResponseShape(rawData) ? rawData : undefined;
      if (rawData !== undefined && !isConflictResponseShape(rawData)) {
        sentryContextService.captureException(new Error('409 response body has unexpected shape'), {
          extra: { rawData: String(rawData).slice(0, 200) },
          tags: { 'api.error': 'conflict_shape_mismatch' },
        });
      }

      // Extract version metadata from request headers
      const clientVersionHeader = originalRequest.headers?.['X-Last-Known-Version'];
      const clientTimestampHeader = originalRequest.headers?.['X-Client-Timestamp'];
      const entityTypeHeader = originalRequest.headers?.['X-Entity-Type'];
      const entityIdHeader = originalRequest.headers?.['X-Entity-Id'];

      const conflictData: ConflictData = {
        id: `conflict_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
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
      const isLoginRequest = originalRequest.url?.includes('/auth/login');

      if (isLoginRequest) {
        const retryAfterHeader = error.response?.headers?.['retry-after'];
        const retryAfterMs = parseRetryAfterMs(retryAfterHeader);

        if (retryAfterMs) {
          const lockUntil = Date.now() + retryAfterMs;
          useAppStore.getState().setAuthLockedUntil(lockUntil);
          appLogger.warnSync('Login rate-limited by server; honouring Retry-After', {
            retryAfterMs,
            lockUntil,
            endpoint: originalRequest.url,
          });
        } else {
          appLogger.warnSync('Login rate-limited but no Retry-After header; applying default UX lockout', {
            endpoint: originalRequest.url,
          });
        }

        return Promise.reject({
          message: 'Too many login attempts. Please wait before trying again.',
          status: 429,
          code: 'RATE_LIMIT_EXCEEDED',
        });
      }

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
      const method = originalRequest.method?.toUpperCase();

      // Only retry idempotent methods by default. Non-idempotent mutations (POST)
      // require an Idempotency-Key header to be retried safely.
      const isIdempotent = method === undefined || IDEMPOTENT_METHODS.has(method);
      const hasIdempotencyKey = Boolean(originalRequest.headers?.['Idempotency-Key']);

      // Initialize deadline on first failure
      if (!originalRequest._retryDeadlineAt) {
        originalRequest._retryDeadlineAt = Date.now();
      }
      const elapsedSinceFirstFailure = Date.now() - originalRequest._retryDeadlineAt;
      const withinDeadline = elapsedSinceFirstFailure < RETRY_DEADLINE_MS;

      if (originalRequest._retryCount < MAX_SERVER_ERROR_RETRIES && (isIdempotent || hasIdempotencyKey) && withinDeadline) {
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
            elapsedMs: elapsedSinceFirstFailure,
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

      // Record timing on terminal failure
      if (originalRequest._timingFinish) {
        const entry = originalRequest._timingFinish(false, status);
        entry.retryCount = originalRequest._retryCount ?? 0;
        notifyEntry(entry);
        originalRequest._timingFinish = undefined;
      }

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

    sentryContextService.captureException(error, {
      tags: { 'api.error': 'unhandled_response' },
      contexts: {
        request: {
          url: originalRequest?.url,
          method: originalRequest?.method?.toUpperCase(),
          status: status ?? null,
        },
      },
      fingerprint: ['api-unhandled-error', String(status ?? 'unknown')],
    });

    return Promise.reject(buildSanitizedApiError(status, error.code));
  }
);

export default apiClient;
