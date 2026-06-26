/**
 * Optimized Pinch Zoom Handler with Native-Driven Animations
 *
 * Uses react-native-gesture-handler and react-native-reanimated for smooth 60fps
 * pinch-to-zoom with animations on the native thread.
 */

import React, { useCallback } from 'react';
import { ViewStyle } from 'react-native';
import { Gesture, GestureDetector, gestureHandlerRootHOC } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

export interface UseOptimizedPinchZoomOptions {
  minScale?: number;
  maxScale?: number;
  initialScale?: number;
  resetOnEnd?: boolean;
  onPinchStart?: () => void;
  onPinchEnd?: (scale: number) => void;
  damping?: number;
  mass?: number;
  children?: React.ReactNode;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Optimized Pinch Zoom Hook using react-native-gesture-handler
 * Provides native-driven pinch gesture detection and smooth scaling animations
 */
export function useOptimizedPinchZoom(options: UseOptimizedPinchZoomOptions = {}) {
  const {
    minScale = 1,
    maxScale = 3,
    initialScale = 1,
    resetOnEnd = false,
    onPinchStart,
    onPinchEnd,
    damping = 10,
    mass = 1,
  } = options;

  // Shared values for animations (native thread)
  const scale = useSharedValue(initialScale);
  const focalPointX = useSharedValue(0);
  const focalPointY = useSharedValue(0);
  const baseScale = useSharedValue(initialScale);

  // Reset pinch state
  const resetPinch = useCallback(() => {
    scale.value = withSpring(resetOnEnd ? 1 : baseScale.value, {
      damping,
      mass,
      overshootClamping: true,
    });
    if (resetOnEnd) {
      baseScale.value = 1;
      if (onPinchEnd) runOnJS(onPinchEnd)(1);
    }
  }, [resetOnEnd, damping, mass, scale, baseScale, onPinchEnd]);

  // Pinch gesture handler
  const pinch = Gesture.Pinch()
    .onStart(() => {
      // Called when pinch gesture starts
      if (onPinchStart) runOnJS(onPinchStart)();
    })
    .onUpdate(event => {
      // Update scale on native thread
      const newScale = clamp(baseScale.value * event.scale, minScale, maxScale);
      scale.value = newScale;

      // Store focal point for potential zoom animation center
      focalPointX.value = event.focalX;
      focalPointY.value = event.focalY;
    })
    .onEnd(event => {
      // Finalize scale and spring back if needed
      const finalScale = clamp(baseScale.value * event.scale, minScale, maxScale);
      baseScale.value = finalScale;

      if (resetOnEnd) {
        scale.value = withSpring(1, {
          damping,
          mass,
          overshootClamping: true,
        });
        if (onPinchEnd) runOnJS(onPinchEnd)(1);
      } else {
        scale.value = withSpring(finalScale, {
          damping,
          mass,
          overshootClamping: true,
        });
        if (onPinchEnd) runOnJS(onPinchEnd)(finalScale);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: focalPointX.value },
      { translateY: focalPointY.value },
      { scale: scale.value },
      { translateX: -focalPointX.value },
      { translateY: -focalPointY.value },
    ],
  }));

  return {
    gesture: pinch,
    animatedStyle,
    scale,
    resetPinch,
  };
}

/**
 * Wrapper component for easy integration with pinch-enabled views
 */
export const OptimizedPinchZoomView = ({
  options,
  onPinchStart,
  onPinchEnd,
  children,
  style,
}: {
  options?: UseOptimizedPinchZoomOptions;
  onPinchStart?: () => void;
  onPinchEnd?: (scale: number) => void;
  children?: React.ReactNode;
  style?: ViewStyle;
}) => {
  const { gesture, animatedStyle } = useOptimizedPinchZoom({
    ...options,
    onPinchStart,
    onPinchEnd,
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>
    </GestureDetector>
  );
};

export default gestureHandlerRootHOC(OptimizedPinchZoomView);
