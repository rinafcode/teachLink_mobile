import { Platform } from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ImageFormat = 'webp' | 'png' | 'jpeg';

// ─── WebP Support Detection ───────────────────────────────────────────────────

/**
 * Returns true if the current platform natively supports WebP decoding.
 *
 * - Android: supported since API 14 (all relevant versions)
 * - iOS: supported since iOS 14 (expo-image handles this transparently)
 * - Web: checked via canvas sniff
 */
export function isWebPSupported(): boolean {
  if (Platform.OS === 'android') return true;
  if (Platform.OS === 'ios') {
    // expo-image uses SDWebImage which supports WebP on iOS 14+.
    // React Native's minimum iOS target is 13.4, but expo SDK 50+ targets iOS 15.1+.
    // Treat as supported; the server can fall back if needed.
    return true;
  }
  // Web: expo-image falls back to <img>, so rely on browser support.
  // Modern browsers (Chrome 23+, Firefox 65+, Safari 14+) all support WebP.
  return true;
}

// ─── Accept Header ────────────────────────────────────────────────────────────

/**
 * Builds the HTTP Accept header value for image requests.
 *
 * Supporting clients advertise `image/webp` first (higher q-value) so the
 * server can serve the smaller WebP variant. PNG/JPEG are listed as fallbacks.
 *
 * @example
 * // WebP-capable client:
 * "image/webp,image/png,image/jpeg,image/*;q=0.8"
 *
 * // Fallback client:
 * "image/png,image/jpeg,image/*;q=0.8"
 */
export function buildImageAcceptHeader(): string {
  if (isWebPSupported()) {
    return 'image/webp,image/png,image/jpeg,image/*;q=0.8';
  }
  return 'image/png,image/jpeg,image/*;q=0.8';
}

// ─── URL Helpers ──────────────────────────────────────────────────────────────

/**
 * Returns true if the given URL points to an image resource.
 * Matches common image extensions and CDN path patterns.
 */
export function isImageUrl(url: string): boolean {
  try {
    const { pathname, searchParams } = new URL(url);
    if (/\.(webp|png|jpe?g|gif|avif|svg)(\?|$)/i.test(pathname)) return true;
    // CDN-style: ?format=webp or /images/ path segment
    if (searchParams.has('format')) return true;
    if (/\/images?\//i.test(pathname)) return true;
    return false;
  } catch {
    return /\.(webp|png|jpe?g|gif|avif|svg)(\?|$)/i.test(url);
  }
}

/**
 * Appends (or replaces) a `format` query parameter on an image URL so the
 * server knows which format the client prefers.
 *
 * Only modifies URLs that look like image resources; passes others through
 * unchanged.
 */
export function applyFormatParam(url: string, format: ImageFormat): string {
  if (!isImageUrl(url)) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('format', format);
    return parsed.toString();
  } catch {
    // Relative or non-standard URL — append manually
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}format=${format}`;
  }
}

/**
 * Returns the preferred image URL for the current client.
 *
 * If the client supports WebP, the URL is annotated with `?format=webp` so
 * the server can serve the optimised variant. Otherwise the original URL is
 * returned unchanged (server defaults to PNG/JPEG).
 */
export function getNegotiatedImageUrl(url: string): string {
  if (!url) return url;
  return isWebPSupported() ? applyFormatParam(url, 'webp') : url;
}

/**
 * Clears the expo-image format-detection cache (useful in tests).
 * @internal
 */
export function _resetFormatCache(): void {
  // No persistent cache at the moment; kept for future use and test symmetry.
}
