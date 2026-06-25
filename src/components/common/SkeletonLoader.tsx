import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  DimensionValue,
  LayoutChangeEvent,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

/**
 * Props for the individual ShimmerItem component
 */
interface ShimmerItemProps {
  width: DimensionValue;
  height: DimensionValue;
  borderRadius?: number;
  circle?: boolean;
  isDark?: boolean;
  style?: ViewStyle;
}

/**
 * A basic shape component that renders a shimmer animation
 */
export const ShimmerItem: React.FC<ShimmerItemProps> = ({
  width,
  height,
  borderRadius = 8,
  circle = false,
  isDark = false,
  style,
}) => {
  const [layoutWidth, setLayoutWidth] = useState(0);
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    ).start();
  }, [animatedValue]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width: w } = event.nativeEvent.layout;
    setLayoutWidth(w);
  };

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-layoutWidth || -300, layoutWidth || 300],
  });

  const finalBorderRadius = circle
    ? typeof height === 'number'
      ? height / 2
      : 9999
    : borderRadius;

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.shimmerBase,
        {
          width,
          height,
          borderRadius: finalBorderRadius,
          backgroundColor: isDark ? '#334155' : '#E5E7EB',
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            transform: [{ translateX }],
            width: '100%',
          },
        ]}
      >
        <LinearGradient
          colors={
            isDark
              ? ['rgba(51, 65, 85, 0)', 'rgba(71, 85, 105, 0.4)', 'rgba(51, 65, 85, 0)']
              : ['rgba(229, 231, 235, 0)', 'rgba(243, 244, 246, 0.7)', 'rgba(229, 231, 235, 0)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

/**
 * Props for the SkeletonLoader component
 */
interface SkeletonLoaderProps {
  /** The design variant of the skeleton loader */
  variant?: 'rows' | 'avatar' | 'card';
  /** Number of rows to render (only applicable for 'rows' variant) */
  rowsCount?: number;
  /** Width override for the skeleton container or shapes */
  width?: DimensionValue;
  /** Height override for the skeleton shapes */
  height?: DimensionValue;
  /** Circle radius or size if rendering avatar/circle */
  size?: number;
  /** Whether to use dark mode styling */
  isDark?: boolean;
  /** Custom styles for the container */
  style?: ViewStyle;
}

/**
 * SkeletonLoader component with shimmer effect and configurable variants.
 * Used to reduce Cumulative Layout Shift (CLS) during async data fetches.
 */
export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'rows',
  rowsCount = 3,
  width = '100%',
  height,
  size = 64,
  isDark = false,
  style,
}) => {
  if (variant === 'avatar') {
    return (
      <View style={[styles.avatarContainer, style]}>
        <ShimmerItem
          width={size}
          height={size}
          circle
          isDark={isDark}
          style={styles.avatarShape}
        />
        <View style={styles.avatarTextContainer}>
          <ShimmerItem
            width={width}
            height={height || 18}
            isDark={isDark}
            style={styles.avatarTitle}
          />
          <ShimmerItem
            width="50%"
            height={height ? (typeof height === 'number' ? height * 0.8 : height) : 14}
            isDark={isDark}
          />
        </View>
      </View>
    );
  }

  if (variant === 'card') {
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const cardBorderColor = isDark ? '#334155' : '#e2e8f0';

    return (
      <View
        style={[
          styles.cardContainer,
          {
            backgroundColor: cardBg,
            borderColor: cardBorderColor,
          },
          style,
        ]}
      >
        <ShimmerItem
          width="100%"
          height={height || 140}
          isDark={isDark}
          style={styles.cardHero}
        />
        <ShimmerItem
          width="85%"
          height={18}
          isDark={isDark}
          style={styles.cardTitle}
        />
        <ShimmerItem
          width="50%"
          height={14}
          isDark={isDark}
        />
      </View>
    );
  }

  // Default 'rows' variant
  const rows = [];
  const baseWidths = ['100%', '92%', '80%', '95%', '70%'];
  const actualRowsCount = rowsCount > 0 ? rowsCount : 3;

  for (let i = 0; i < actualRowsCount; i++) {
    rows.push(
      <ShimmerItem
        key={`row-${i}`}
        width={baseWidths[i % baseWidths.length] as DimensionValue}
        height={height || 16}
        isDark={isDark}
        style={{ marginBottom: i === actualRowsCount - 1 ? 0 : 10 }}
      />
    );
  }

  return <View style={[styles.rowsContainer, style]}>{rows}</View>;
};

const styles = StyleSheet.create({
  shimmerBase: {
    overflow: 'hidden',
    position: 'relative',
  },
  rowsContainer: {
    width: '100%',
    flexDirection: 'column',
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  avatarShape: {
    marginRight: 16,
    flexShrink: 0,
  },
  avatarTextContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  avatarTitle: {
    marginBottom: 8,
  },
  cardContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'column',
    width: '100%',
  },
  cardHero: {
    borderRadius: 12,
    marginBottom: 12,
  },
  cardTitle: {
    marginBottom: 8,
  },
});

export default SkeletonLoader;
