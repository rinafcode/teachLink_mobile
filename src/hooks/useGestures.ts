import * as React from 'react';
import type { GestureResponderEvent, ViewProps } from 'react-native';
import { AccessibilityInfo } from 'react-native';

/**
 * A tiny gesture "arbiter" to prevent recognizers (swipe/pinch/long-press/etc.)
 * from interfering with each other.
 *
 * Design:
 * - A gesture can "claim" exclusivity once it is confident it should win.
 * - While a gesture is active, other gestures should ignore move/end events.
 * - Optional priority lets you prefer e.g. pinch over swipe.
 *
 * This is intentionally framework-agnostic: individual gesture hooks use the
 * coordinator but still implement their own recognition logic.
 */

export type GestureId = string;

export interface GestureClaimOptions {
  /**
   * Higher priority claims can pre-empt lower ones before activation.
   * Once a gesture is active, it stays active until it releases.
   */
  priority?: number;
}

export interface GestureCoordinator {
  /** Attempt to claim exclusivity for a gesture. Returns true if granted. */
  tryClaim: (id: GestureId, options?: GestureClaimOptions) => boolean;
  /** Release exclusivity if currently owned by `id`. */
  release: (id: GestureId) => void;
  /** True if any gesture is currently active. */
  hasActiveGesture: () => boolean;
  /** True if `id` is the currently active gesture. */
  isActive: (id: GestureId) => boolean;
  /** The active gesture id, if any. */
  getActiveId: () => GestureId | null;
}

export interface UseGesturesOptions {
  /**
   * If true, claims are disabled (gestures still detect but won't "lock").
   * Useful as a "graceful degrade" switch if you want to avoid complex
   * interactions in some contexts.
   */
  disabled?: boolean;
}

export function useGestures(options: UseGesturesOptions = {}): GestureCoordinator {
  const { disabled = false } = options;

  const activeIdRef = React.useRef<GestureId | null>(null);

  const tryClaim = React.useCallback<GestureCoordinator['tryClaim']>(
    (id, claimOptions) => {
      if (disabled) return false;

      const priority = claimOptions?.priority ?? 0;

      // If no active gesture, allow.
      if (activeIdRef.current == null) {
        activeIdRef.current = id;
        void priority; // retained for future pre-emption logic
        return true;
      }

      // If already active, only the owner is allowed.
      if (activeIdRef.current === id) return true;

      // Pre-activation arbitration: allow a higher priority gesture to take the lock
      // *only* if we haven't meaningfully committed yet.
      // For simplicity we treat "activeIdRef.current is set" as committed, so no pre-emption.
      // If you need pre-emption, add an explicit "candidate" state.
      return false;
    },
    [disabled],
  );

  const release = React.useCallback<GestureCoordinator['release']>((id) => {
    if (activeIdRef.current === id) {
      activeIdRef.current = null;
    }
  }, []);

  const hasActiveGesture = React.useCallback(() => activeIdRef.current != null, []);
  const isActive = React.useCallback((id: GestureId) => activeIdRef.current === id, []);
  const getActiveId = React.useCallback(() => activeIdRef.current, []);

  // Expose stable object identity for easy passing across hooks.
  return React.useMemo(
    () => ({
      tryClaim,
      release,
      hasActiveGesture,
      isActive,
      getActiveId,
    }),
    [tryClaim, release, hasActiveGesture, isActive, getActiveId],
  );
}

export interface UseDoubleTapOptions {
  /** Max delay between taps (ms). */
  maxDelayMs?: number;
  /** Cancel if finger moves beyond this distance (px). */
  maxMoveDistance?: number;
  /**
   * Called on successful double tap.
   * Note: screen readers often reserve double-tap for "activate"; by default
   * we disable recognition when a screen reader is enabled.
   */
  onDoubleTap: (info: { pageX: number; pageY: number }) => void;
  /** Optional single-tap callback if the second tap doesn't arrive in time. */
  onSingleTap?: (info: { pageX: number; pageY: number }) => void;
  /** Disable recognition when screen reader is enabled (default true). */
  disableWhenScreenReaderEnabled?: boolean;
}

export type DoubleTapHandlers = Pick<
  ViewProps,
  | 'onStartShouldSetResponder'
  | 'onMoveShouldSetResponder'
  | 'onResponderGrant'
  | 'onResponderMove'
  | 'onResponderRelease'
  | 'onResponderTerminate'
  | 'onResponderTerminationRequest'
>;

function distanceSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

/**
 * Double-tap recognizer (no dependencies).
 * - Uses responder events so it works on native.
 * - Avoids interfering with accessibility: disabled by default when a screen reader is enabled.
 */
export function useDoubleTap(options: UseDoubleTapOptions) {
  const {
    maxDelayMs = 250,
    maxMoveDistance = 12,
    onDoubleTap,
    onSingleTap,
    disableWhenScreenReaderEnabled = true,
  } = options;

  const [screenReaderEnabled, setScreenReaderEnabled] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      if (mounted) setScreenReaderEnabled(enabled);
    });
    const sub = AccessibilityInfo.addEventListener?.('screenReaderChanged', (enabled) => {
      setScreenReaderEnabled(Boolean(enabled));
    });
    return () => {
      mounted = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sub as any)?.remove?.();
    };
  }, []);

  const tap1Ref = React.useRef<{ t: number; x: number; y: number } | null>(null);
  const startRef = React.useRef<{ x: number; y: number } | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | number | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const startTimeRef = React.useRef<number | null>(null);
  const movedTooFarRef = React.useRef(false);

  const clearTimer = React.useCallback(() => {
    if (timerRef.current) {
      if (typeof timerRef.current === 'number') {
        clearTimeout(timerRef.current);
      }
      timerRef.current = null;
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    startTimeRef.current = null;
  }, []);

  const reset = React.useCallback(() => {
    clearTimer();
    startRef.current = null;
    tap1Ref.current = null;
    movedTooFarRef.current = false;
  }, [clearTimer]);

  const handlers = React.useMemo<DoubleTapHandlers>(() => {
    const disabled = disableWhenScreenReaderEnabled && screenReaderEnabled;

    return {
      onStartShouldSetResponder: (e) => !disabled && e.nativeEvent.touches.length === 1,
      onMoveShouldSetResponder: (e) => !disabled && e.nativeEvent.touches.length === 1,
      onResponderTerminationRequest: () => true,
      onResponderGrant: (e) => {
        if (disabled) return;
        const { pageX: x, pageY: y } = e.nativeEvent;
        startRef.current = { x, y };
        movedTooFarRef.current = false;
      },
      onResponderMove: (e: GestureResponderEvent) => {
        if (disabled) return;
        const s = startRef.current;
        if (!s) return;
        const { pageX, pageY } = e.nativeEvent;
        const maxSq = maxMoveDistance * maxMoveDistance;
        if (distanceSq(pageX, pageY, s.x, s.y) > maxSq) movedTooFarRef.current = true;
      },
      onResponderRelease: (e) => {
        if (disabled) return;
        const { pageX: x, pageY: y } = e.nativeEvent;
        const now = Date.now();

        if (movedTooFarRef.current) {
          reset();
          return;
        }

        const tap1 = tap1Ref.current;
        if (tap1 && now - tap1.t <= maxDelayMs) {
          clearTimer();
          tap1Ref.current = null;
          onDoubleTap({ pageX: x, pageY: y });
          return;
        }

        // First tap: wait for the second.
        tap1Ref.current = { t: now, x, y };
        clearTimer();
        startTimeRef.current = performance.now();
        
        // Use requestAnimationFrame for frame-synced timing
        const checkDuration = (timestamp: number) => {
          const elapsed = timestamp - (startTimeRef.current ?? timestamp);
          if (elapsed >= maxDelayMs) {
            // Duration elapsed, trigger single tap
            const stored = tap1Ref.current;
            tap1Ref.current = null;
            if (stored) onSingleTap?.({ pageX: stored.x, pageY: stored.y });
          } else {
            // Continue checking
            rafRef.current = requestAnimationFrame(checkDuration);
          }
        };
        
        rafRef.current = requestAnimationFrame(checkDuration);
      },
      onResponderTerminate: () => reset(),
    };
  }, [
    clearTimer,
    disableWhenScreenReaderEnabled,
    maxDelayMs,
    maxMoveDistance,
    onDoubleTap,
    onSingleTap,
    reset,
    screenReaderEnabled,
  ]);

  React.useEffect(() => reset, [reset]);

  return { doubleTapHandlers: handlers, resetDoubleTap: reset };
}

