import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, ViewStyle } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
  variant?: 'text' | 'circular' | 'rectangular';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
  variant = 'rectangular',
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const getVariantStyle = (): { width: number | string; height: number | string; borderRadius: number } => {
    switch (variant) {
      case 'circular':
        return {
          width: typeof width === 'number' ? width : 40,
          height: typeof height === 'number' ? height : 40,
          borderRadius: (typeof width === 'number' ? width : 40) / 2,
        };
      case 'text':
        return {
          width,
          height: typeof height === 'number' ? height : 16,
          borderRadius: 4,
        };
      default:
        return {
          width,
          height,
          borderRadius,
        };
    }
  };

  const variantStyle = getVariantStyle();

  return (
    <Animated.View
      style={[styles.skeleton, variantStyle as any, { opacity }, style as ViewStyle]}
    />
  );
};

interface SkeletonGroupProps {
  count?: number;
  spacing?: number;
  children?: React.ReactNode;
}

export const SkeletonGroup: React.FC<SkeletonGroupProps> = ({
  count = 3,
  spacing = 12,
  children,
}) => {
  if (children) {
    return <View style={[styles.group, { gap: spacing }]}>{children}</View>;
  }

  return (
    <View style={[styles.group, { gap: spacing }]}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} />
      ))}
    </View>
  );
};

interface CourseCardSkeletonProps {
  style?: ViewStyle;
}

export const CourseCardSkeleton: React.FC<CourseCardSkeletonProps> = ({ style }) => {
  return (
    <View style={[cardStyles.container, style]}>
      <Skeleton variant="rectangular" height={120} borderRadius={8} />
      <View style={cardStyles.content}>
        <Skeleton width="80%" height={18} borderRadius={4} />
        <Skeleton width="60%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
        <View style={cardStyles.meta}>
          <Skeleton variant="circular" width={24} height={24} />
          <Skeleton width="30%" height={12} borderRadius={4} />
        </View>
      </View>
    </View>
  );
};

interface ProfileSkeletonProps {
  style?: ViewStyle;
}

export const ProfileSkeleton: React.FC<ProfileSkeletonProps> = ({ style }) => {
  return (
    <View style={[profileStyles.container, style]}>
      <View style={profileStyles.header}>
        <Skeleton variant="circular" width={80} height={80} />
        <Skeleton width="50%" height={24} borderRadius={6} style={{ marginTop: 12 }} />
        <Skeleton width="35%" height={16} borderRadius={4} style={{ marginTop: 8 }} />
      </View>
      <View style={profileStyles.stats}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={profileStyles.statItem}>
            <Skeleton width={40} height={20} borderRadius={4} />
            <Skeleton width={50} height={12} borderRadius={4} style={{ marginTop: 4 }} />
          </View>
        ))}
      </View>
      <View style={profileStyles.section}>
        <Skeleton height={44} borderRadius={8} />
        <Skeleton height={44} borderRadius={8} style={{ marginTop: 8 }} />
        <Skeleton height={44} borderRadius={8} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E5E7EB',
  },
  group: {
    width: '100%',
  },
});

const cardStyles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    padding: 12,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
});

const profileStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  section: {
    marginTop: 24,
  },
});