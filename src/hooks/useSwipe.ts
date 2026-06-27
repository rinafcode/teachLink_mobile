import * as React from 'react';

import type { GestureCoordinator } from './useGestures';
import type { GestureResponderEvent, ViewProps } from 'react-native';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export interface SwipeInfo {
  direction: SwipeDirection;
  /** Total distance in the dominant axis (px). */
  distance: number;
  /** Signed distance in X (px). */
  dx: number;
  /** Signed distance in Y (px). */
  dy: number;
  /** Approx. velocity in dominant axis (px/ms). */
  velocity: number;
  /** Time since gesture start (ms). */
  durationMs: number;
}

export interface UseSwipeOptions {
  /** Minimum movement (px) before a swipe is recognized. */
  minDistance?: number;
  /** If both axes move, require a ratio to decide the dominant axis. */
  axisLockRatio?: number;
  /** Called once when a swipe is recognized (after claiming). */
  onSwipeStart?: (info: SwipeInfo) => void;
  /** Called on release if swipe was recognized. */
  onSwipeEnd?: (info: SwipeInfo) => void;
  /** Called on release if swipe never met the threshold. */
  onSwipeCancel?: () => void;
  /**
   * Optional coordinator to prevent conflicts (e.g. pinch vs swipe).
   * If provided, swipe will only proceed if it can claim.
   */
  coordinator?: GestureCoordinator;
  /** Identifier used by the coordinator (defaults to 'swipe'). */
  id?: string;
}

export interface SwipeHandlers
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

function pickDirection(dx: number, dy: number): SwipeDirection {
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
  return dy >= 0 ? 'down' : 'up';
}

function nowMs(): number {
  // Date.now is stable and cheap enough for gesture timestamps.
  return Date.now();
}

/**
 * Swipe detection using React Native's responder system (no external deps).
 * - Avoids re-renders by keeping gesture state in refs.
 * - Tries to avoid accidental swipes by requiring minDistance + axis lock ratio.
 */
export function useSwipe(options: UseSwipeOptions = {}) {
  const {
    minDistance = 18,
    axisLockRatio = 1.15,
    onSwipeStart,
    onSwipeEnd,
    onSwipeCancel,
    coordinator,
    id = 'swipe',
  } = options;

  const startRef = React.useRef<{
    x: number;
    y: number;
    t: number;
  } | null>(null);

  const recognizedRef = React.useRef(false);
  const lastRef = React.useRef<{ dx: number; dy: number; t: number }>({ dx: 0, dy: 0, t: 0 });

  const reset = React.useCallback(() => {
    startRef.current = null;
    recognizedRef.current = false;
    lastRef.current = { dx: 0, dy: 0, t: 0 };
    coordinator?.release(id);
  }, [coordinator, id]);

  const buildInfo = React.useCallback(
    (dx: number, dy: number, tNow: number): SwipeInfo => {
      const start = startRef.current;
      const t0 = start?.t ?? tNow;
      const durationMs = Math.max(1, tNow - t0);
      const direction = pickDirection(dx, dy);
      const dominant = direction === 'left' || direction === 'right' ? dx : dy;
      const distance = Math.abs(dominant);
      const velocity = dominant / durationMs; // px/ms
      return { direction, distance, dx, dy, velocity, durationMs };
    },
    [],
  );

  const handlers = React.useMemo<SwipeHandlers>(() => {
    return {
      onStartShouldSetResponder: (e) => {
        // Single touch only.
        return e.nativeEvent.touches.length === 1;
      },
      onMoveShouldSetResponder: (e) => {
        // Don't become responder if another gesture is already active.
        if (coordinator?.hasActiveGesture() && !coordinator.isActive(id)) return false;
        return e.nativeEvent.touches.length === 1;
      },
      onResponderTerminationRequest: () => true,
      onResponderGrant: (e) => {
        const t = nowMs();
        const { pageX: x, pageY: y } = e.nativeEvent;
        startRef.current = { x, y, t };
        recognizedRef.current = false;
        lastRef.current = { dx: 0, dy: 0, t };
      },
      onResponderMove: (e: GestureResponderEvent) => {
        if (e.nativeEvent.touches.length !== 1) return;

        // If another gesture claimed, ignore.
        if (coordinator?.hasActiveGesture() && !coordinator.isActive(id)) return;

        const start = startRef.current;
        if (!start) return;

        const tNow = nowMs();
        const dx = e.nativeEvent.pageX - start.x;
        const dy = e.nativeEvent.pageY - start.y;

        // Axis-lock heuristic to reduce accidental diagonal triggers.
        const ax = Math.abs(dx);
        const ay = Math.abs(dy);
        const dominantIsX = ax >= ay * axisLockRatio;
        const dominantIsY = ay >= ax * axisLockRatio;

        if (!recognizedRef.current) {
          const movedEnough = Math.max(ax, ay) >= minDistance;
          if (!movedEnough) return;
          if (!dominantIsX && !dominantIsY) return;

          // Claim exclusivity only when we're confident it's a swipe.
          const claimed = coordinator ? coordinator.tryClaim(id, { priority: 0 }) : true;
          if (!claimed) return;

          recognizedRef.current = true;
          onSwipeStart?.(buildInfo(dx, dy, tNow));
        }

        lastRef.current = { dx, dy, t: tNow };
      },
      onResponderRelease: () => {
        const start = startRef.current;
        const { dx, dy, t } = lastRef.current;
        const tNow = nowMs();

        if (recognizedRef.current && start) {
          onSwipeEnd?.(buildInfo(dx, dy, t || tNow));
        } else {
          onSwipeCancel?.();
        }
        reset();
      },
      onResponderTerminate: () => {
        onSwipeCancel?.();
        reset();
      },
    };
  }, [
    axisLockRatio,
    buildInfo,
    coordinator,
    id,
    minDistance,
    onSwipeCancel,
    onSwipeEnd,
    onSwipeStart,
    reset,
  ]);

  return { swipeHandlers: handlers, resetSwipe: reset };
}

