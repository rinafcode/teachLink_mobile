/**
 * src/services/api/axiosCircuitBreakerInterceptor.ts
 *
 * Plugs the circuit breaker registry into the axios pipeline.
 *
 * Call `installCircuitBreakerInterceptor(apiClient)` once, right after
 * the existing interceptors are installed in axios.config.ts.
 *
 * How it works:
 *   REQUEST side — if the breaker for the matched group is OPEN,
 *   the request is fast-failed immediately with CircuitOpenError (no network call).
 *
 *   RESPONSE side — records success/failure into the breaker so the CLOSED → OPEN
 *   threshold is maintained independently of the health-check runner.
 *
 * Endpoint → group mapping:
 *   /auth/*        → 'auth'
 *   /sync/*        → 'sync'
 *   /notifications/* → 'notifications'
 *   /payments/*    → 'payments'
 *   everything else → no breaker applied
 */

import { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { appLogger } from '../../utils/logger';
import { circuitBreakerRegistry, CircuitOpenError } from './circuitBreaker';

// ─── Endpoint group routing ────────────────────────────────────────────────

const ENDPOINT_GROUPS: Array<{ pattern: RegExp; group: string }> = [
  { pattern: /\/auth\//,          group: 'auth' },
  { pattern: /\/sync\//,          group: 'sync' },
  { pattern: /\/notifications\//, group: 'notifications' },
  { pattern: /\/payments?\//,     group: 'payments' },
];

function resolveGroup(url: string | undefined): string | null {
  if (!url) return null;
  for (const { pattern, group } of ENDPOINT_GROUPS) {
    if (pattern.test(url)) return group;
  }
  return null;
}

// ─── Interceptor installer ─────────────────────────────────────────────────

export function installCircuitBreakerInterceptor(client: AxiosInstance): void {
  // ── Request interceptor — fast-fail when circuit is OPEN ─────────────────
  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      const group = resolveGroup(config.url);
      if (!group) return config;

      const breaker = circuitBreakerRegistry.get(group);

      // tick() is internal; we call execute with a no-op to let the FSM
      // decide whether to throw. We piggyback on the existing execute path
      // by attaching the group to the config so the response interceptor
      // can record the outcome.
      if (breaker.getState() === 'OPEN') {
        appLogger.warnSync(
          `[CircuitBreaker] Fast-failing "${config.url}" — circuit OPEN for group "${group}"`
        );
        return Promise.reject(new CircuitOpenError(group));
      }

      // Tag the config so the response interceptor knows which group to update
      (config as InternalAxiosRequestConfig & { _circuitGroup?: string })._circuitGroup = group;
      return config;
    },
    (error: unknown) => Promise.reject(error)
  );

  // ── Response interceptor — record success / failure ───────────────────────
  client.interceptors.response.use(
    response => {
      const group = (
        response.config as InternalAxiosRequestConfig & { _circuitGroup?: string }
      )._circuitGroup;
      if (group) {
        // A successful response closes the success path in the breaker.
        // We call execute with a resolved promise so onSuccess() runs.
        circuitBreakerRegistry.get(group).execute(() => Promise.resolve()).catch(() => {
          // onSuccess already ran — ignore the resolved value
        });
      }
      return response;
    },
    async (error: AxiosError) => {
      // Don't double-count CircuitOpenError as a failure
      if (error instanceof CircuitOpenError) {
        return Promise.reject(error);
      }

      const group = (
        error.config as (InternalAxiosRequestConfig & { _circuitGroup?: string }) | undefined
      )?._circuitGroup;

      if (group && error.response) {
        // Only count server errors (5xx) as breaker failures.
        // 4xx are client errors and should not open the circuit.
        if (error.response.status >= 500) {
          circuitBreakerRegistry.get(group).execute(() => Promise.reject(error)).catch(() => {
            // failure recorded — error will propagate normally below
          });
        }
      }

      return Promise.reject(error);
    }
  );
}