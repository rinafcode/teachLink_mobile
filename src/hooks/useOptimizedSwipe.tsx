/**
 * Optimized Swipe Gesture Handler with Native-Driven Animations
 *
 * Uses react-native-gesture-handler and react-native-reanimated for smooth 60fps
 * gestures with animations on the native thread, avoiding JS bridge overhead.
 */

import React, { useCallback, useRef } from 'react';
import { ViewStyle } from 'react-native';
import { Gesture, GestureDetector, gestureHandlerRootHOC } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

import { SwipeDirection, SwipeInfo } from './useSwipe';

export interface UseOptimizedSwipeOptions {
  minDistance?: number;
  axisLockRatio?: number;
  onSwipeStart?: (info: SwipeInfo) => void;
  onSwipeEnd?: (info: SwipeInfo) => void;
  onSwipeCancel?: () => void;
  velocityThreshold?: number;
  damping?: number;
  mass?: number;
  children?: React.ReactNode;
}

interface SwipeState {
  startX: number;
  startY: number;
  startTime: number;
  recognized: boolean;
}

function pickDirection(dx: number, dy: number): SwipeDirection {
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  if (absDx >= absDy) {
    return dx >= 0 ? 'right' : 'left';
  }
  return dy >= 0 ? 'down' : 'up';
}

/**
 * Optimized Swipe Hook using react-native-gesture-handler
 * Provides native-driven gesture detection and smooth animations
 */
export function useOptimizedSwipe(options: UseOptimizedSwipeOptions = {}) {
  const {
    minDistance = 18,
    axisLockRatio = 1.15,
    onSwipeStart,
    onSwipeEnd,
    onSwipeCancel,
    velocityThreshold = 0.1,
    damping = 10,
    mass = 1,
  } = options;

  const stateRef = useRef<SwipeState>({
    startX: 0,
    startY: 0,
    startTime: 0,
    recognized: false,
  });

  // Shared values for animations (native thread)
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  // Reset gesture state
  const resetGesture = useCallback(() => {
    stateRef.current.recognized = false;
    translateX.value = withSpring(0, {
      damping,
      mass,
      overshootClamping: true,
    });
    translateY.value = withSpring(0, {
      damping,
      mass,
      overshootClamping: true,
    });
    opacity.value = withSpring(1, {
      damping,
      mass,
    });
  }, [damping, mass, opacity, translateX, translateY]);

  // Build swipe info
  const buildSwipeInfo = useCallback(
    (currentX: number, currentY: number, currentTime: number): SwipeInfo => {
      const { startX, startY, startTime } = stateRef.current;
      const dx = currentX - startX;
      const dy = currentY - startY;
      const distance = Math.hypot(dx, dy);
      const durationMs = Math.max(1, currentTime - startTime);
      const velocity = distance / durationMs;
      const direction = pickDirection(dx, dy);

      return {
        direction,
        distance,
        dx,
        dy,
        velocity,
        durationMs,
      };
    },
    []
  );

  // Pan gesture for swipe detection
  const pan = Gesture.Pan()
    .onStart(event => {
      stateRef.current.startX = event.x;
      stateRef.current.startY = event.y;
      stateRef.current.startTime = Date.now();
    })
    .onUpdate(event => {
      // Update position values on native thread
      translateX.value = event.translationX;
      translateY.value = event.translationY;

      // Check if swipe should be recognized
      if (!stateRef.current.recognized) {
        const dx = event.translationX;
        const dy = event.translationY;
        const distance = Math.hypot(dx, dy);
        const dominantAxis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
        const ratio =
          dominantAxis === 'x'
            ? Math.abs(dx) / (Math.abs(dy) + 0.1)
            : Math.abs(dy) / (Math.abs(dx) + 0.1);

        if (distance > minDistance && ratio > axisLockRatio) {
          stateRef.current.recognized = true;
          const swipeInfo = buildSwipeInfo(
            stateRef.current.startX + dx,
            stateRef.current.startY + dy,
            Date.now()
          );
          // Use runOnJS to call JS callback from native animation thread
          if (onSwipeStart) runOnJS(onSwipeStart)(swipeInfo);
          opacity.value = withSpring(0.8, { damping, mass });
        }
      }
    })
    .onEnd(event => {
      if (stateRef.current.recognized) {
        const currentTime = Date.now();
        const swipeInfo = buildSwipeInfo(
          stateRef.current.startX + event.translationX,
          stateRef.current.startY + event.translationY,
          currentTime
        );

        // Check if swipe velocity is sufficient
        if (swipeInfo.velocity > velocityThreshold || swipeInfo.distance > minDistance * 1.5) {
          if (onSwipeEnd) runOnJS(onSwipeEnd)(swipeInfo);
        } else {
          if (onSwipeCancel) runOnJS(onSwipeCancel)();
        }
      } else {
        if (onSwipeCancel) runOnJS(onSwipeCancel)();
      }

      runOnJS(resetGesture)();
    })
    .onFinalize(() => {
      runOnJS(resetGesture)();
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return {
    gesture: pan,
    animatedStyle,
    translateX,
    translateY,
    opacity,
    resetGesture,
  };
}

/**
 * Wrapper component for easy integration with swipe-enabled views
 */
export const OptimizedSwipeView = ({
  options,
  onSwipeStart,
  onSwipeEnd,
  onSwipeCancel,
  children,
  style,
}: {
  options?: UseOptimizedSwipeOptions;
  onSwipeStart?: (info: SwipeInfo) => void;
  onSwipeEnd?: (info: SwipeInfo) => void;
  onSwipeCancel?: () => void;
  children?: React.ReactNode;
  style?: ViewStyle;
}) => {
  const { gesture, animatedStyle } = useOptimizedSwipe({
    ...options,
    onSwipeStart,
    onSwipeEnd,
    onSwipeCancel,
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>
    </GestureDetector>
  );
};

export default gestureHandlerRootHOC(OptimizedSwipeView);
