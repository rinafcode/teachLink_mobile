import * as Haptics from 'expo-haptics';
import { Trash2, Archive } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  LayoutChangeEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

import { useSwipeableCoordinator } from './SwipeableCoordinator';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.35;

const SPRING_CONFIG = {
  damping: 28,
  stiffness: 190,
  mass: 0.8,
  overshootClamping: true,
};

export interface SwipeableRowProps {
  children: React.ReactNode;
  id: string;
  onDelete?: () => void;
  onArchive?: () => void;
  deleteLabel?: string;
  archiveLabel?: string;
}

export const SwipeableRow: React.FC<SwipeableRowProps> = ({
  children,
  id,
  onDelete,
  onArchive,
  deleteLabel = 'Delete',
  archiveLabel = 'Archive',
}) => {
  const translationX = useSharedValue(0);
  const itemHeight = useSharedValue<number | null>(null);
  const isDeletedShared = useSharedValue(false);
  const isHapticTriggered = useSharedValue(false);
  const [layoutHeight, setLayoutHeight] = useState<number | null>(null);

  const { registerRow, unregisterRow, onRowSwipeStart } = useSwipeableCoordinator();

  // Close row method
  const closeRow = () => {
    'worklet';
    translationX.value = withSpring(0, SPRING_CONFIG);
  };

  // Register for single-open row coordination
  useEffect(() => {
    registerRow(id, () => {
      'worklet';
      translationX.value = withSpring(0, SPRING_CONFIG);
    });
    return () => {
      unregisterRow(id);
    };
  }, [id, registerRow, unregisterRow, translationX]);

  // Reset row state when ID/key changes (reused item state reset)
  useEffect(() => {
    translationX.value = 0;
    isDeletedShared.value = false;
    isHapticTriggered.value = false;
  }, [id, isDeletedShared, isHapticTriggered, translationX]);

  // Haptic feedback trigger on JavaScript thread
  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10]) // Don't intercept minor horizontal scroll/clicks
    .failOffsetY([-15, 15]) // Cancel if swiping vertically
    .onStart(() => {
      runOnJS(onRowSwipeStart)(id);
    })
    .onUpdate(event => {
      let newX = event.translationX;

      // Restrict swipe direction if action is not supported
      if (newX < 0 && !onDelete) {
        newX = 0;
      }
      if (newX > 0 && !onArchive) {
        newX = 0;
      }

      translationX.value = newX;

      const absX = Math.abs(newX);
      if (absX >= SWIPE_THRESHOLD) {
        if (!isHapticTriggered.value) {
          isHapticTriggered.value = true;
          runOnJS(triggerHaptic)();
        }
      } else {
        isHapticTriggered.value = false;
      }
    })
    .onEnd(() => {
      const absX = Math.abs(translationX.value);
      const isPastThreshold = absX >= SWIPE_THRESHOLD;

      if (isPastThreshold) {
        if (translationX.value < 0 && onDelete) {
          // Snap open to Delete Confirmation State
          translationX.value = withSpring(-SWIPE_THRESHOLD, SPRING_CONFIG);
        } else if (translationX.value > 0 && onArchive) {
          // Snap open to Archive State
          translationX.value = withSpring(SWIPE_THRESHOLD, SPRING_CONFIG);
        } else {
          closeRow();
        }
      } else {
        closeRow();
      }
    });

  const handleLayout = (event: LayoutChangeEvent) => {
    if (layoutHeight === null) {
      const { height } = event.nativeEvent.layout;
      setLayoutHeight(height);
      itemHeight.value = height;
    }
  };

  const executeDelete = () => {
    isDeletedShared.value = true;
    translationX.value = withTiming(-SCREEN_WIDTH, { duration: 200 });
    itemHeight.value = withTiming(0, { duration: 250 }, finished => {
      if (finished && onDelete) {
        runOnJS(onDelete)();
      }
    });
  };

  const executeArchive = () => {
    translationX.value = withTiming(SCREEN_WIDTH, { duration: 200 }, finished => {
      if (finished && onArchive) {
        runOnJS(onArchive)();
      }
    });
  };

  const animatedRowStyle = useAnimatedStyle(() => {
    const height = itemHeight.value !== null ? itemHeight.value : 'auto';
    return {
      transform: [{ translateX: translationX.value }],
      height: height as any,
      opacity: isDeletedShared.value ? withTiming(0, { duration: 200 }) : 1,
    };
  });

  const animatedActionsStyle = useAnimatedStyle(() => {
    return {
      opacity: translationX.value !== 0 ? 1 : 0,
    };
  });

  const animatedArchiveStyle = useAnimatedStyle(() => {
    const scale =
      translationX.value > 0
        ? Math.min(1.2, Math.max(0.5, translationX.value / SWIPE_THRESHOLD))
        : 0.5;
    const opacity = translationX.value > 0 ? 1 : 0;
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const animatedDeleteStyle = useAnimatedStyle(() => {
    const scale =
      translationX.value < 0
        ? Math.min(1.2, Math.max(0.5, Math.abs(translationX.value) / SWIPE_THRESHOLD))
        : 0.5;
    const opacity = translationX.value < 0 ? 1 : 0;
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <View style={styles.container} onLayout={handleLayout} testID={`swipeable-row-${id}`}>
      {/* Dynamic Native-Thread Action Layer */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.actionsContainer, animatedActionsStyle]}
      >
        {/* Left Side Archive Reveal Button */}
        {onArchive && (
          <TouchableOpacity
            style={[styles.actionButton, styles.archiveButton]}
            onPress={executeArchive}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={archiveLabel}
            testID={`archive-btn-${id}`}
          >
            <Animated.View style={[styles.actionIconContainer, animatedArchiveStyle]}>
              <Archive size={22} color="#fff" />
              <Text style={styles.actionText}>{archiveLabel}</Text>
            </Animated.View>
          </TouchableOpacity>
        )}

        {/* Filler block to prevent empty overlaps */}
        <View style={styles.filler} />

        {/* Right Side Delete Reveal Button */}
        {onDelete && (
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={executeDelete}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={deleteLabel}
            testID={`delete-btn-${id}`}
          >
            <Animated.View style={[styles.actionIconContainer, animatedDeleteStyle]}>
              <Trash2 size={22} color="#fff" />
              <Text style={styles.actionText}>{deleteLabel}</Text>
            </Animated.View>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Swipeable Main Foreground Item */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.foregroundItem, animatedRowStyle]}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  foregroundItem: {
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    zIndex: 0,
  },
  actionButton: {
    width: SWIPE_THRESHOLD,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  archiveButton: {
    backgroundColor: '#eab308', // Premium solid gold
  },
  deleteButton: {
    backgroundColor: '#ef4444', // Premium solid crimson
  },
  actionIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filler: {
    flex: 1,
  },
});
