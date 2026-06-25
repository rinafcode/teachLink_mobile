import * as React from 'react';
import { Animated, Easing } from 'react-native';

import type { GestureCoordinator } from './useGestures';
import type { GestureResponderEvent, ViewProps } from 'react-native';

export interface UsePinchZoomOptions {
  /** Minimum allowed zoom scale. */
  minScale?: number;
  /** Maximum allowed zoom scale. */
  maxScale?: number;
  /** Starting scale (default 1). */
  initialScale?: number;
  /**
   * If true, snaps back to 1 when gesture ends (common "image preview" UX).
   * If false, clamps to min/max and keeps last scale.
   */
  resetOnEnd?: boolean;
  /** Optional callback with final scale after end animation/clamp. */
  onPinchEnd?: (scale: number) => void;
  /**
   * Optional coordinator to prevent conflicts (pinch should beat swipe).
   */
  coordinator?: GestureCoordinator;
  /** Identifier used by the coordinator (defaults to 'pinch'). */
  id?: string;
}

export interface PinchHandlers
  extends Pick<
    ViewProps,
    | 'onStartShouldSetResponder'
    | 'onMoveShouldSetResponder'
    | 'onResponderGrant'
    | 'onResponderMove'
    | 'onResponderRelease'
    | 'onResponderTerminate'
    | 'onResponderTerminationRequest'
  > {}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function distance(a: { pageX: number; pageY: number }, b: { pageX: number; pageY: number }): number {
  const dx = a.pageX - b.pageX;
  const dy = a.pageY - b.pageY;
  return Math.hypot(dx, dy);
}

/**
 * Pinch-to-zoom implemented using responder events + Animated.Value.
 * Performance notes:
 * - We update the Animated.Value directly (no React state) during move.
 * - We throttle updates with requestAnimationFrame to avoid flooding the bridge.
 */
export function usePinchZoom(options: UsePinchZoomOptions = {}) {
  const {
    minScale = 1,
    maxScale = 3,
    initialScale = 1,
    resetOnEnd = false,
    onPinchEnd,
    coordinator,
    id = 'pinch',
  } = options;

  const scale = React.useRef(new Animated.Value(initialScale)).current;

  const baseScaleRef = React.useRef(initialScale);
  const startDistanceRef = React.useRef<number | null>(null);
  const activeRef = React.useRef(false);

  const rafRef = React.useRef<number | null>(null);
  const pendingScaleRef = React.useRef<number | null>(null);

  const setScaleImmediate = React.useCallback(
    (next: number) => {
      baseScaleRef.current = clamp(next, minScale, maxScale);
      scale.setValue(baseScaleRef.current);
    },
    [maxScale, minScale, scale],
  );

  const animateTo = React.useCallback(
    (next: number) => {
      const clamped = clamp(next, minScale, maxScale);
      baseScaleRef.current = clamped;
      Animated.timing(scale, {
        toValue: clamped,
        duration: 160,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onPinchEnd?.(clamped);
      });
    },
    [maxScale, minScale, onPinchEnd, scale],
  );

  const resetPinch = React.useCallback(() => {
    activeRef.current = false;
    startDistanceRef.current = null;
    pendingScaleRef.current = null;
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    coordinator?.release(id);
  }, [coordinator, id]);

  const scheduleScaleUpdate = React.useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const pending = pendingScaleRef.current;
      if (pending == null) return;
      scale.setValue(pending);
    });
  }, [scale]);

  const handlers = React.useMemo<PinchHandlers>(() => {
    return {
      onStartShouldSetResponder: (e) => e.nativeEvent.touches.length === 2,
      onMoveShouldSetResponder: (e) => {
        if (e.nativeEvent.touches.length !== 2) return false;
        if (coordinator?.hasActiveGesture() && !coordinator.isActive(id)) return false;
        return true;
      },
      onResponderTerminationRequest: () => true,
      onResponderGrant: (e) => {
        if (e.nativeEvent.touches.length !== 2) return;

        // Pinch should generally win conflicts over swipe.
        const claimed = coordinator ? coordinator.tryClaim(id, { priority: 10 }) : true;
        if (!claimed) return;

        activeRef.current = true;
        const [t0, t1] = e.nativeEvent.touches;
        startDistanceRef.current = distance(t0, t1);
      },
      onResponderMove: (e: GestureResponderEvent) => {
        if (!activeRef.current) return;
        if (e.nativeEvent.touches.length !== 2) return;
        if (coordinator?.hasActiveGesture() && !coordinator.isActive(id)) return;

        const startDistance = startDistanceRef.current;
        if (!startDistance || startDistance <= 0) return;

        const [t0, t1] = e.nativeEvent.touches;
        const d = distance(t0, t1);
        const raw = baseScaleRef.current * (d / startDistance);
        const next = clamp(raw, minScale, maxScale);

        pendingScaleRef.current = next;
        scheduleScaleUpdate();
      },
      onResponderRelease: () => {
        if (!activeRef.current) {
          resetPinch();
          return;
        }

        const current = pendingScaleRef.current ?? baseScaleRef.current;
        if (resetOnEnd) {
          animateTo(1);
        } else {
          animateTo(current);
        }
        resetPinch();
      },
      onResponderTerminate: () => {
        resetPinch();
      },
    };
  }, [animateTo, coordinator, id, maxScale, minScale, resetOnEnd, resetPinch, scheduleScaleUpdate]);

  return {
    pinchHandlers: handlers,
    scale,
    setScaleImmediate,
    animateTo,
    resetPinch,
  };
}

