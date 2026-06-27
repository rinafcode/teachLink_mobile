import { useRef, useCallback } from 'react';

/**
 * Touch event deduplication specification:
 *
 * Problem: React Native (and the underlying platform) can fire touch events
 * multiple times for a single physical tap — e.g. due to touchstart/click
 * overlap on the JS bridge or gesture recogniser re-entry.
 *
 * Solution: Record the timestamp and screen coordinates of the last processed
 * tap.  Any subsequent tap arriving within DEDUP_WINDOW_MS and within
 * DEDUP_RADIUS_PX of the previous tap is silently discarded.
 *
 * Constants:
 *   DEDUP_WINDOW_MS  – 300 ms  (matches the platform double-tap threshold)
 *   DEDUP_RADIUS_PX  – 10 px   (finger drift tolerance)
 */

/** Time window in milliseconds within which a duplicate tap is suppressed. */
const DEDUP_WINDOW_MS = 300;

/** Spatial radius in pixels within which a tap is considered "same location". */
const DEDUP_RADIUS_PX = 10;

export interface TapCoordinates {
  x: number;
  y: number;
}

export interface UseTouchDeduplicationOptions {
  /**
   * Override the deduplication time window (ms).
   * @default 300
   */
  windowMs?: number;
  /**
   * Override the spatial radius (px) for same-location detection.
   * @default 10
   */
  radiusPx?: number;
}

export interface UseTouchDeduplicationResult {
  /**
   * Wrap any touch handler with this function.
   * Returns `true` when the tap is accepted (unique), `false` when it is a
   * duplicate and should be ignored.
   *
   * @example
   * const { deduplicateTap } = useTouchDeduplication();
   *
   * const handlePress = deduplicateTap({ x: event.pageX, y: event.pageY }, () => {
   *   submitForm();
   * });
   */
  deduplicateTap: (coords: TapCoordinates, handler: () => void) => void;

  /**
   * Lower-level predicate: returns `true` if the tap at `coords` is NOT a
   * duplicate of the previous accepted tap.  Advances the internal state when
   * `true` is returned.
   */
  isFreshTap: (coords: TapCoordinates) => boolean;

  /** Reset deduplication state (useful after navigation or form reset). */
  reset: () => void;
}

interface LastTap {
  timestamp: number;
  x: number;
  y: number;
}

/**
 * `useTouchDeduplication` — React hook that prevents double-submissions and
 * accidental double-actions caused by a single physical tap firing multiple
 * touch events.
 *
 * Tracks the timestamp and coordinates of the last accepted tap.  Duplicate
 * taps arriving within `windowMs` (default 300 ms) at the same location
 * (within `radiusPx`, default 10 px) are ignored.
 *
 * @param options - Optional overrides for `windowMs` and `radiusPx`.
 * @returns `deduplicateTap`, `isFreshTap`, and `reset`.
 *
 * @example
 * function SubmitButton({ onSubmit }) {
 *   const { deduplicateTap } = useTouchDeduplication();
 *
 *   const handlePress = (event) => {
 *     deduplicateTap({ x: event.pageX, y: event.pageY }, onSubmit);
 *   };
 *
 *   return <TouchableOpacity onPress={handlePress}>…</TouchableOpacity>;
 * }
 */
export function useTouchDeduplication(
  options: UseTouchDeduplicationOptions = {}
): UseTouchDeduplicationResult {
  const { windowMs = DEDUP_WINDOW_MS, radiusPx = DEDUP_RADIUS_PX } = options;

  const lastTapRef = useRef<LastTap | null>(null);

  /**
   * Returns `true` when the tap is fresh (unique) and advances internal state.
   * Returns `false` when the tap is a duplicate — caller should discard it.
   */
  const isFreshTap = useCallback(
    (coords: TapCoordinates): boolean => {
      const now = Date.now();
      const last = lastTapRef.current;

      if (last !== null) {
        const elapsed = now - last.timestamp;
        const dx = coords.x - last.x;
        const dy = coords.y - last.y;
        const distanceSq = dx * dx + dy * dy;
        const radiusSq = radiusPx * radiusPx;

        if (elapsed < windowMs && distanceSq <= radiusSq) {
          // Duplicate tap — suppress it
          return false;
        }
      }

      // Accept tap and record it
      lastTapRef.current = { timestamp: now, x: coords.x, y: coords.y };
      return true;
    },
    [windowMs, radiusPx]
  );

  /**
   * Convenience wrapper: calls `handler` only when the tap is fresh.
   */
  const deduplicateTap = useCallback(
    (coords: TapCoordinates, handler: () => void): void => {
      if (isFreshTap(coords)) {
        handler();
      }
    },
    [isFreshTap]
  );

  /** Clear internal tap state. */
  const reset = useCallback((): void => {
    lastTapRef.current = null;
  }, []);

  return { deduplicateTap, isFreshTap, reset };
}
