import React, { useEffect, useRef } from 'react';
import { Animated, AppState, AppStateStatus, DimensionValue, StyleSheet, View, ViewStyle } from 'react-native';
import { useAdaptiveFrameRate } from '../../hooks/useAdaptiveFrameRate';

/**
 * Props for the Skeleton component
 */
interface SkeletonProps {
  /** Width of the skeleton */
  width?: DimensionValue;
  /** Height of the skeleton */
  height?: DimensionValue;
  /** Border radius of the skeleton */
  borderRadius?: number;
  /** Whether to render as a circle */
  circle?: boolean;
  /** Custom style for the skeleton */
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  borderRadius = 8,
  circle = false,
  style,
}) => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const { durationMultiplier } = useAdaptiveFrameRate();

  const startAnimation = () => {
    // Stop any existing animation before starting a new one
    animationRef.current?.stop();

    const sharedAnimationConfig = {
      duration: 1000 * durationMultiplier,
      useNativeDriver: true,
    };

    animationRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          ...sharedAnimationConfig,
          toValue: 0.7,
        }),
        Animated.timing(pulseAnim, {
          ...sharedAnimationConfig,
          toValue: 0.3,
        }),
      ])
    );
    animationRef.current.start();
  };

  useEffect(() => {
    startAnimation();

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        startAnimation();
      } else {
        // background or inactive — pause the shimmer
        animationRef.current?.stop();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      animationRef.current?.stop();
      subscription.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationMultiplier]);

  const skeletonStyle: ViewStyle = {
    width: width,
    height: height,
    borderRadius: circle ? (typeof height === 'number' ? height / 2 : 999) : borderRadius,
    backgroundColor: '#E5E7EB',
    opacity: pulseAnim as any,
  };

  return <Animated.View style={[skeletonStyle, style]} />;
};

/**
 * Props for the SkeletonGroup component
 */
export const SkeletonGroup: React.FC<{ children: React.ReactNode; style?: ViewStyle }> = ({
  children,
  style,
}) => {
  return <View style={style}>{children}</View>;
};
