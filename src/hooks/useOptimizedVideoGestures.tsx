/**
 * Optimized Video Gestures Handler with Native-Driven Animations
 *
 * Uses react-native-gesture-handler and react-native-reanimated for smooth video
 * scrubbing and seeking gestures on the native thread.
 */

import React, { useCallback, useRef } from 'react';
import { View, ViewStyle } from 'react-native';
import { Gesture, GestureDetector, gestureHandlerRootHOC } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';

export interface UseOptimizedVideoGesturesOptions {
  currentPositionMillis: number;
  durationMillis: number;
  containerWidth: number;
  onSeek: (positionMillis: number) => void;
  onSeekStart?: () => void;
  onSeekEnd?: () => void;
  onSeekPreview?: (positionMillis: number) => void;
  onTogglePlayPause: () => void;
  edgeSlop?: number;
  deadZonePx?: number;
  seekSensitivity?: number;
  tapDebounceMs?: number;
  children?: React.ReactNode;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Optimized Video Gestures Hook using react-native-gesture-handler
 * Provides native-driven pan gestures for video scrubbing with smooth animations
 */
export function useOptimizedVideoGestures(options: UseOptimizedVideoGesturesOptions) {
  const {
    currentPositionMillis,
    durationMillis,
    containerWidth,
    onSeek,
    onSeekStart,
    onSeekEnd,
    onSeekPreview,
    onTogglePlayPause,
    edgeSlop = 24,
    deadZonePx = 12,
    seekSensitivity = 0.9,
    tapDebounceMs = 280,
  } = options;

  // Track pan state
  const startPositionRef = useRef(0);
  const lastTapRef = useRef(0);
  const isScrubbing = useSharedValue(false);
  const previewPositionMillis = useSharedValue<number | null>(null);

  // Update refs when props change
  React.useEffect(() => {
    // These are just for reference, actual values come from gesture params
  }, [currentPositionMillis, durationMillis]);

  // Pan gesture for video scrubbing
  const pan = Gesture.Pan()
    .onStart(event => {
      // Check if pan starts in valid area
      if (!durationMillis || containerWidth <= 0) return;

      // Store starting position
      startPositionRef.current = currentPositionMillis;
      isScrubbing.value = true;
      runOnJS(onSeekStart?.())();
    })
    .onUpdate(event => {
      if (!durationMillis || containerWidth <= 0) {
        return;
      }

      // Calculate new position based on pan distance
      const width = Math.max(containerWidth, 1);
      const deltaRatio = event.translationX / width;
      const deltaMillis = deltaRatio * durationMillis * seekSensitivity;
      const nextPosition = clamp(startPositionRef.current + deltaMillis, 0, durationMillis);

      // Update preview position
      previewPositionMillis.value = nextPosition;
      runOnJS(onSeekPreview?.(nextPosition))();
    })
    .onEnd(event => {
      if (previewPositionMillis.value !== null) {
        const finalPosition = previewPositionMillis.value;
        runOnJS(onSeek)(finalPosition);
      }

      isScrubbing.value = false;
      previewPositionMillis.value = null;
      runOnJS(onSeekEnd?.())();
    })
    .shouldCancelWhenOutside(true);

  // Single tap gesture for play/pause
  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .maxDist(10)
    .onEnd(() => {
      const now = Date.now();
      if (now - lastTapRef.current >= tapDebounceMs) {
        lastTapRef.current = now;
        runOnJS(onTogglePlayPause)();
      }
    });

  // Double tap gesture (e.g., for skip forward/backward)
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDist(10)
    .onEnd(() => {
      // Could implement skip forward/backward here
    });

  // Exclusive gestures: if single tap fires, double tap won't
  const tapGesture = Gesture.Exclusive(singleTap, doubleTap);
  const videoGesture = Gesture.Simultaneous(pan, tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: isScrubbing.value ? 0.8 : 1,
  }));

  return {
    gesture: videoGesture,
    animatedStyle,
    isScrubbing,
    previewPositionMillis,
  };
}

/**
 * Wrapper component for easy integration with video-enabled views
 */
export const OptimizedVideoGesturesView = ({
  options,
  children,
  style,
}: {
  options: UseOptimizedVideoGesturesOptions;
  children?: React.ReactNode;
  style?: ViewStyle;
}) => {
  const { gesture, animatedStyle } = useOptimizedVideoGestures(options);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>
    </GestureDetector>
  );
}

export default gestureHandlerRootHOC(OptimizedVideoGesturesView);
