import * as React from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

type AnyScrollComponent = React.ComponentType<any>;

export interface PullToRefreshProps {
  /**
   * A scrollable component to render (e.g. Animated.ScrollView, FlatList, SectionList).
   * Default: Animated.ScrollView
   */
  ScrollComponent?: AnyScrollComponent;
  /** Props forwarded to the scroll component (data/renderItem/etc. for lists). */
  scrollProps?: Record<string, unknown>;
  /** Content to render inside ScrollView-like components. */
  children?: React.ReactNode;

  /** Called when refresh triggers. Can return a promise. */
  onRefresh: () => void | Promise<void>;
  /** External refreshing state (optional). If omitted, managed internally. */
  refreshing?: boolean;

  /** Pull distance (px) required to trigger refresh. */
  threshold?: number;
  /** Max pull distance for visual feedback (px). */
  maxPull?: number;

  /** Optional container style. */
  style?: StyleProp<ViewStyle>;
  /** Optional indicator container style. */
  indicatorStyle?: StyleProp<ViewStyle>;

  /** Accessibility label for the fallback refresh button. */
  refreshA11yLabel?: string;
  /** Show an explicit button fallback for screen readers. */
  showA11yFallbackButton?: boolean;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Pull-to-refresh wrapper with smooth Animated feedback.
 *
 * Notes:
 * - Uses responder capture only when at top and user is pulling down.
 * - Avoids re-renders during drag by updating Animated.Value directly.
 * - Provides a screen-reader friendly button fallback (optional).
 */
export function PullToRefresh(props: PullToRefreshProps) {
  const {
    ScrollComponent = Animated.ScrollView,
    scrollProps,
    children,
    onRefresh,
    refreshing: refreshingProp,
    threshold = 80,
    maxPull = 140,
    style,
    indicatorStyle,
    refreshA11yLabel = 'Refresh content',
    showA11yFallbackButton = true,
  } = props;

  const pullY = React.useRef(new Animated.Value(0)).current;
  const lastPullRef = React.useRef(0);
  const scrollYRef = React.useRef(0);
  const startYRef = React.useRef<number | null>(null);
  const pullingRef = React.useRef(false);
  const inFlightRef = React.useRef(false);

  const [internalRefreshing, setInternalRefreshing] = React.useState(false);
  const refreshing = refreshingProp ?? internalRefreshing;

  const [screenReaderEnabled, setScreenReaderEnabled] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isScreenReaderEnabled().then(enabled => {
      if (mounted) setScreenReaderEnabled(enabled);
    });
    const sub = AccessibilityInfo.addEventListener?.('screenReaderChanged', enabled => {
      setScreenReaderEnabled(Boolean(enabled));
    });
    return () => {
      mounted = false;
      // RN types vary by version; guard-remove.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sub as any)?.remove?.();
    };
  }, []);

  const animatePullTo = React.useCallback(
    (toValue: number) => {
      Animated.timing(pullY, {
        toValue,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    },
    [pullY]
  );

  const runRefresh = React.useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    if (refreshingProp == null) setInternalRefreshing(true);
    try {
      await onRefresh();
    } finally {
      if (refreshingProp == null) setInternalRefreshing(false);
      inFlightRef.current = false;
    }
  }, [onRefresh, refreshingProp]);

  // Keep indicator visible while refreshing.
  React.useEffect(() => {
    if (refreshing) animatePullTo(Math.min(threshold, maxPull));
    else animatePullTo(0);
  }, [animatePullTo, maxPull, refreshing, threshold]);

  const onScroll = React.useCallback(
    (e: any) => {
      scrollYRef.current = e?.nativeEvent?.contentOffset?.y ?? 0;
      // Forward if consumer provided their own onScroll.
      const consumerOnScroll = (scrollProps as any)?.onScroll;
      consumerOnScroll?.(e);
    },
    [scrollProps]
  );

  const canStartPull = () => !refreshing && scrollYRef.current <= 0;

  const responderHandlers = React.useMemo(
    () => ({
      onStartShouldSetResponder: () => false,
      onMoveShouldSetResponder: (e: any) => {
        if (!canStartPull()) return false;
        const y0 = startYRef.current;
        const pageY = e?.nativeEvent?.pageY;
        if (typeof pageY !== 'number') return false;
        if (y0 == null) return false;
        const dy = pageY - y0;
        // Only capture if user is pulling down intentionally.
        return dy > 4;
      },
      onResponderGrant: (e: any) => {
        startYRef.current = e?.nativeEvent?.pageY ?? null;
        pullingRef.current = false;
      },
      onResponderMove: (e: any) => {
        if (!canStartPull()) return;
        const y0 = startYRef.current;
        const pageY = e?.nativeEvent?.pageY;
        if (typeof pageY !== 'number' || y0 == null) return;

        const dy = Math.max(0, pageY - y0);
        if (dy <= 0) return;

        pullingRef.current = true;
        // Resistance curve: feels more "native" than linear.
        const resisted = maxPull * (1 - Math.exp(-dy / 120));
        const next = clamp(resisted, 0, maxPull);
        lastPullRef.current = next;
        pullY.setValue(next);
      },
      onResponderRelease: async () => {
        const pulled = lastPullRef.current;

        startYRef.current = null;

        if (pulled >= threshold && !refreshing) {
          animatePullTo(Math.min(threshold, maxPull));
          await runRefresh();
          animatePullTo(0);
        } else {
          animatePullTo(0);
        }
        pullingRef.current = false;
        lastPullRef.current = 0;
      },
      onResponderTerminate: () => {
        startYRef.current = null;
        pullingRef.current = false;
        lastPullRef.current = 0;
        animatePullTo(0);
      },
      onResponderTerminationRequest: () => true,
    }),
    [animatePullTo, maxPull, pullY, refreshing, runRefresh, threshold]
  );

  const progress = pullY.interpolate({
    inputRange: [0, threshold],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.container, style]} {...responderHandlers}>
      {showA11yFallbackButton && screenReaderEnabled ? (
        <View style={styles.a11yRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={refreshA11yLabel}
            onPress={() => {
              if (refreshing) return;
              void runRefresh();
            }}
            style={styles.a11yButton}
          >
            <Animated.Text style={styles.a11yButtonText}>Refresh</Animated.Text>
          </Pressable>
        </View>
      ) : null}

      <Animated.View
        pointerEvents="none"
        style={[
          styles.indicator,
          indicatorStyle,
          {
            transform: [{ translateY: pullY }],
            opacity: progress,
          },
        ]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <ActivityIndicator animating={refreshing} />
      </Animated.View>

      <Animated.View style={{ transform: [{ translateY: pullY }] }}>
        <ScrollComponent
          // Keep scroll smooth; only our outer responder captures when at top + pulling down.
          scrollEventThrottle={16}
          {...(scrollProps as any)}
          onScroll={onScroll}
        >
          {children}
        </ScrollComponent>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    top: -44,
    left: 0,
    right: 0,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  a11yRow: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  a11yButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#e5e7eb',
  },
  a11yButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
});
