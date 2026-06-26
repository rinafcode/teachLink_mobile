/**
 * Resource hints utility (#409)
 *
 * Implements preconnect and DNS-prefetch for external resources so that
 * TCP/TLS handshakes and DNS lookups are resolved before the first real
 * request is made, reducing perceived latency.
 *
 * Platform behaviour:
 *  - Web:    injects <link rel="preconnect"> / <link rel="dns-prefetch"> into
 *            the document <head> (standard browser resource hints).
 *  - Native: issues a lightweight HEAD request to warm up the connection.
 *            Falls back silently on any network error so startup is never
 *            blocked.
 */

import { Platform } from 'react-native';
import { requireEnvVariables } from '../config';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ResourceHintType = 'preconnect' | 'dns-prefetch';

export interface ResourceHint {
  /** Fully-qualified origin, e.g. "https://cdn.teachlink.com" */
  url: string;
  /** Hint type. Defaults to "preconnect". */
  type?: ResourceHintType;
  /**
   * Whether to include credentials (CORS).
   * Only relevant for preconnect on web. Defaults to false.
   */
  crossOrigin?: boolean;
}

export interface ResourceHintsResult {
  /** Origins that were successfully hinted / warmed up. */
  succeeded: string[];
  /** Origins that failed (network error, invalid URL, etc.). */
  failed: string[];
}

// ─── Default external resources ───────────────────────────────────────────────

/**
 * External origins used by TeachLink.
 * Add / remove entries here as the infrastructure changes.
 */
export const DEFAULT_RESOURCE_HINTS: ResourceHint[] = [
  // CDN for course assets (images, videos)
  { url: 'https://cdn.teachlink.com', type: 'preconnect' },
  // Analytics endpoint
  { url: 'https://analytics.teachlink.com', type: 'dns-prefetch' },
  // Ad / monetisation network
  { url: 'https://ads.teachlink.com', type: 'dns-prefetch' },
  // Sentry error reporting
  { url: 'https://o0.ingest.sentry.io', type: 'preconnect' },
];

/**
 * Get resource hints including API and socket hosts.
 */
export function getResourceHints(): ResourceHint[] {
  const hints = [...DEFAULT_RESOURCE_HINTS];
  try {
    const env = requireEnvVariables();
    const apiUrl = new URL(env.EXPO_PUBLIC_API_BASE_URL);
    hints.push({ url: `${apiUrl.protocol}//${apiUrl.host}`, type: 'preconnect', crossOrigin: true });
    const socketUrl = new URL(env.EXPO_PUBLIC_SOCKET_URL);
    const socketOrigin = `${socketUrl.protocol.replace('ws', 'http')}//${socketUrl.host}`;
    hints.push({ url: socketOrigin, type: 'preconnect' });
  } catch {
    // Ignore if env variables aren't available yet (shouldn't happen after requireEnvVariables())
  }
  return hints;
}

// ─── Web implementation ───────────────────────────────────────────────────────

/**
 * Inject a <link> resource-hint tag into the document <head>.
 * No-ops if the tag already exists (idempotent).
 */
function injectWebHint(hint: ResourceHint): void {
  if (typeof document === 'undefined') return;

  const { url, type = 'preconnect', crossOrigin = false } = hint;
  const rel = type;

  // Avoid duplicate tags
  const existing = document.querySelector(`link[rel="${rel}"][href="${url}"]`);
  if (existing) return;

  const link = document.createElement('link');
  link.rel = rel;
  link.href = url;
  if (crossOrigin) link.crossOrigin = 'anonymous';

  document.head.appendChild(link);
}

// ─── Native implementation ────────────────────────────────────────────────────

/**
 * Warm up a connection on native by issuing a HEAD request.
 * The response body is discarded; we only care about establishing the
 * TCP/TLS session in the OS network stack.
 *
 * Returns true on success, false on any error.
 */
async function warmUpNative(url: string): Promise<boolean> {
  try {
    // Validate URL before attempting the request
    new URL(url);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 s timeout

    await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      // Prevent caching the warm-up request itself
      headers: { 'Cache-Control': 'no-store' },
    });

    clearTimeout(timeoutId);
    return true;
  } catch {
    // Network errors, CORS, timeouts — all silently ignored
    return false;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Apply resource hints for a list of external origins.
 *
 * - On **web**: injects `<link rel="preconnect">` / `<link rel="dns-prefetch">`
 *   tags into `<head>`.
 * - On **native**: fires background HEAD requests to warm up connections.
 *
 * This function never throws; failures are collected in the returned result.
 *
 * @param hints - Array of resource hints to apply.
 *                Defaults to `DEFAULT_RESOURCE_HINTS` plus API hosts.
 */
export async function applyResourceHints(
  hints: ResourceHint[] = getResourceHints()
): Promise<ResourceHintsResult> {
  const result: ResourceHintsResult = { succeeded: [], failed: [] };

  if (Platform.OS === 'web') {
    // Synchronous on web — just inject the link tags
    for (const hint of hints) {
      try {
        new URL(hint.url); // validate
        injectWebHint(hint);
        result.succeeded.push(hint.url);
      } catch {
        result.failed.push(hint.url);
      }
    }
    return result;
  }

  // Native: fire all warm-up requests in parallel
  const outcomes = await Promise.allSettled(
    hints.map(async hint => {
      const ok = await warmUpNative(hint.url);
      return { url: hint.url, ok };
    })
  );

  for (const outcome of outcomes) {
    if (outcome.status === 'fulfilled') {
      const { url, ok } = outcome.value;
      if (ok) {
        result.succeeded.push(url);
      } else {
        result.failed.push(url);
      }
    } else {
      // Promise itself rejected (shouldn't happen, but be safe)
      result.failed.push('unknown');
    }
  }

  return result;
}

/**
 * Convenience wrapper: apply the default resource hints and log the outcome
 * in development. Safe to call at app startup without awaiting.
 */
export function prefetchExternalResources(): void {
  applyResourceHints(getResourceHints()).then(result => {
    if (__DEV__) {
      console.log(
        `[ResourceHints] preconnect/dns-prefetch: ` +
          `${result.succeeded.length} succeeded, ${result.failed.length} failed`
      );
    }
  });
}
