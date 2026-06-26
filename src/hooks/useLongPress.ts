import * as React from 'react';
import type { GestureResponderEvent, ViewProps } from 'react-native';
import { Animated, Easing } from 'react-native';
import type { GestureCoordinator } from './useGestures';

export interface LongPressInfo {
  pageX: number;
  pageY: number;
}

export interface UseLongPressOptions {
  /** How long the user must press before triggering (ms). */
  durationMs?: number;
  /** Cancel long press if finger moves more than this distance (px). */
  maxMoveDistance?: number;
  /** Called when long press triggers (includes touch point for positioning). */
  onLongPress: (info: LongPressInfo) => void;
  /** Optional callback when long press is cancelled. */
  onCancel?: () => void;
  /**
   * Optional coordinator to prevent conflicts (e.g. swipe should cancel long-press).
   * We only claim when about to trigger to avoid blocking scroll/swipe prematurely.
   */
  coordinator?: GestureCoordinator;
  /** Identifier used by the coordinator (defaults to 'longPress'). */
  id?: string;
}

export interface LongPressHandlers
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

function distanceSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

/**
 * Long-press recognizer with:
 * - configurable duration
 * - cancel-on-move
 * - optional press highlight animation (via `pressProgress` Animated.Value)
 */
export function useLongPress(options: UseLongPressOptions) {
  const {
    durationMs = 500,
    maxMoveDistance = 10,
    onLongPress,
    onCancel,
    coordinator,
    id = 'longPress',
  } = options;

  const pressProgress = React.useRef(new Animated.Value(0)).current;

  const startRef = React.useRef<{ x: number; y: number } | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | number | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const firedRef = React.useRef(false);
  const cancelledRef = React.useRef(false);
  const startTimeRef = React.useRef<number | null>(null);

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
    firedRef.current = false;
    cancelledRef.current = false;
    coordinator?.release(id);

    Animated.timing(pressProgress, {
      toValue: 0,
      duration: 120,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // progress is often used for opacity/bg, keep on JS
    }).start();
  }, [clearTimer, coordinator, id, pressProgress]);

  const cancel = React.useCallback(() => {
    if (cancelledRef.current) return;
    cancelledRef.current = true;
    onCancel?.();
    reset();
  }, [onCancel, reset]);

  const handlers = React.useMemo<LongPressHandlers>(() => {
    return {
      onStartShouldSetResponder: (e) => e.nativeEvent.touches.length === 1,
      onMoveShouldSetResponder: (e) => e.nativeEvent.touches.length === 1,
      onResponderTerminationRequest: () => true,
      onResponderGrant: (e) => {
        if (e.nativeEvent.touches.length !== 1) return;
        const { pageX: x, pageY: y } = e.nativeEvent;

        startRef.current = { x, y };
        firedRef.current = false;
        cancelledRef.current = false;

        Animated.timing(pressProgress, {
          toValue: 1,
          duration: durationMs,
          easing: Easing.linear,
          useNativeDriver: false,
        }).start();

        clearTimer();
        startTimeRef.current = performance.now();
        
        // Use requestAnimationFrame for frame-synced timing
        const checkDuration = (timestamp: number) => {
          if (cancelledRef.current || firedRef.current) return;
          
          const elapsed = timestamp - (startTimeRef.current ?? timestamp);
          if (elapsed >= durationMs) {
            // Duration elapsed, trigger long press
            if (cancelledRef.current || firedRef.current) return;
            // Claim only at trigger time so we don't block scroll/swipe prematurely.
            const claimed = coordinator ? coordinator.tryClaim(id, { priority: 5 }) : true;
            if (!claimed) {
              cancel();
              return;
            }
            firedRef.current = true;
            const s = startRef.current;
            if (s) onLongPress({ pageX: s.x, pageY: s.y });
          } else {
            // Continue checking
            rafRef.current = requestAnimationFrame(checkDuration);
          }
        };
        
        rafRef.current = requestAnimationFrame(checkDuration);
      },
      onResponderMove: (e: GestureResponderEvent) => {
        if (e.nativeEvent.touches.length !== 1) {
          cancel();
          return;
        }
        if (firedRef.current) return;
        // If some other gesture claimed, long press should cancel.
        if (coordinator?.hasActiveGesture() && !coordinator.isActive(id)) {
          cancel();
          return;
        }

        const s = startRef.current;
        if (!s) return;
        const { pageX, pageY } = e.nativeEvent;
        const maxSq = maxMoveDistance * maxMoveDistance;
        if (distanceSq(pageX, pageY, s.x, s.y) > maxSq) {
          cancel();
        }
      },
      onResponderRelease: () => {
        // If it fired, keep progress at 1 briefly then reset.
        if (!firedRef.current) onCancel?.();
        reset();
      },
      onResponderTerminate: () => {
        onCancel?.();
        reset();
      },
    };
  }, [
    cancel,
    clearTimer,
    coordinator,
    durationMs,
    id,
    maxMoveDistance,
    onCancel,
    onLongPress,
    pressProgress,
    reset,
  ]);

  // Defensive cleanup on unmount.
  React.useEffect(() => reset, [reset]);

  return { longPressHandlers: handlers, pressProgress, resetLongPress: reset };
}

