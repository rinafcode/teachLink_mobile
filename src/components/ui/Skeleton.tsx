import React, { useEffect, useRef } from 'react';
import { Animated, DimensionValue, StyleSheet, View, ViewStyle } from 'react-native';

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

  useEffect(() => {
    const sharedAnimationConfig = {
      duration: 1000,
      useNativeDriver: true,
    };

    Animated.loop(
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
    ).start();
  }, [pulseAnim]);

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
