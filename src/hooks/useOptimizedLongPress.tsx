/**
 * Optimized Long Press Handler with Native-Driven Animations
 *
 * Uses react-native-gesture-handler and react-native-reanimated for smooth long-press
 * feedback animations on the native thread.
 */

import React, { useCallback, useRef } from 'react';
import { ViewStyle } from 'react-native';
import { Gesture, GestureDetector, gestureHandlerRootHOC } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

import { LongPressInfo } from './useLongPress';

export interface UseOptimizedLongPressOptions {
  durationMs?: number;
  maxMoveDistance?: number;
  onLongPress: (info: LongPressInfo) => void;
  onCancel?: () => void;
  showFeedback?: boolean;
  feedbackDamping?: number;
  feedbackMass?: number;
  children?: React.ReactNode;
}

function distanceSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

/**
 * Optimized Long Press Hook using react-native-gesture-handler
 * Provides native-driven long press detection with visual feedback animations
 */
export function useOptimizedLongPress(options: UseOptimizedLongPressOptions) {
  const {
    durationMs = 500,
    maxMoveDistance = 10,
    onLongPress,
    onCancel,
    showFeedback = true,
    feedbackDamping = 12,
    feedbackMass = 1,
  } = options;

  // Track long press state
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const firedRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);

  // Shared values for feedback animations (native thread)
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Clean up timer
  const clearTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // Reset long press state
  const reset = useCallback(() => {
    clearTimer();
    firedRef.current = false;

    if (showFeedback) {
      scale.value = withSpring(1, {
        damping: feedbackDamping,
        mass: feedbackMass,
        overshootClamping: true,
      });
      opacity.value = withSpring(1, {
        damping: feedbackDamping,
        mass: feedbackMass,
      });
    }
  }, [clearTimer, showFeedback, scale, opacity, feedbackDamping, feedbackMass]);

  // Long press gesture
  const longPress = Gesture.LongPress()
    .minDuration(durationMs)
    .onStart(event => {
      startXRef.current = event.x;
      startYRef.current = event.y;

      // Start visual feedback animation
      if (showFeedback) {
        scale.value = withTiming(0.95, {
          duration: durationMs,
          easing: Easing.inOut(Easing.cubic),
        });
        opacity.value = withTiming(0.7, {
          duration: durationMs,
          easing: Easing.inOut(Easing.cubic),
        });
      }
    })
    .onUpdate(event => {
      // Check if finger moved too much
      const distSq = distanceSq(event.x, startXRef.current, event.y, startYRef.current);

      if (distSq > maxMoveDistance * maxMoveDistance) {
        // Too much movement, cancel
        clearTimer();
        reset();
        if (onCancel) runOnJS(onCancel)();
      }
    })
    .onFinalize(event => {
      clearTimer();

      if (!firedRef.current) {
        firedRef.current = true;

        // Trigger haptic feedback and callback
        const longPressInfo: LongPressInfo = {
          pageX: event.x,
          pageY: event.y,
        };

        // Run callback on JS thread
        runOnJS(onLongPress)(longPressInfo);

        // Spring back animation
        if (showFeedback) {
          scale.value = withSpring(1, {
            damping: feedbackDamping,
            mass: feedbackMass,
            overshootClamping: true,
          });
          opacity.value = withSpring(1, {
            damping: feedbackDamping,
            mass: feedbackMass,
          });
        }
      } else {
        reset();
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return {
    gesture: longPress,
    animatedStyle,
    reset,
  };
}

/**
 * Wrapper component for easy integration with long-press-enabled views
 */
export const OptimizedLongPressView = ({
  options,
  onLongPress,
  onCancel,
  children,
  style,
}: {
  options?: Omit<UseOptimizedLongPressOptions, 'onLongPress' | 'onCancel'>;
  onLongPress: (info: LongPressInfo) => void;
  onCancel?: () => void;
  children?: React.ReactNode;
  style?: ViewStyle;
}) => {
  const { gesture, animatedStyle } = useOptimizedLongPress({
    ...options,
    onLongPress,
    onCancel,
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>
    </GestureDetector>
  );
};

export default gestureHandlerRootHOC(OptimizedLongPressView);
