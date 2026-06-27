/**
 * STREAMING PROGRESS BAR COMPONENT
 * 
 * Displays streaming progress with animated bar and metrics display.
 * Shows progress percentage, chunk count, and TTFB/latency information.
 */

import React from 'react';
import { View, Text, Animated, StyleSheet, ViewStyle } from 'react-native';
import { useSharedValue, withTiming } from 'react-native-reanimated';

export interface StreamingProgressBarProps {
  /** Progress percentage (0-100) */
  progress: number;
  /** Whether streaming is active */
  isStreaming: boolean;
  /** Number of chunks received */
  chunkCount?: number;
  /** Time to first byte in milliseconds */
  ttfb?: number | null;
  /** Total time elapsed in milliseconds */
  totalTime?: number | null;
  /** Container style override */
  style?: ViewStyle;
  /** Show detailed metrics */
  showMetrics?: boolean;
  /** Progress bar color */
  barColor?: string;
  /** Background color */
  backgroundColor?: string;
  /** Height of progress bar */
  height?: number;
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  progressContainer: {
    width: '100%',
    height: 4,
    backgroundColor: '#E8E8E8',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4A90E2',
    borderRadius: 2,
  },
  metricsContainer: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricText: {
    fontSize: 12,
    color: '#666',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  ttfbText: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '600',
  },
});

/**
 * Progress bar component for streaming data
 * 
 * @example
 * ```tsx
 * <StreamingProgressBar
 *   progress={progress}
 *   isStreaming={isStreaming}
 *   chunkCount={chunkCount}
 *   ttfb={ttfb}
 *   showMetrics={true}
 * />
 * ```
 */
export const StreamingProgressBar = React.memo(
  ({
    progress,
    isStreaming,
    chunkCount = 0,
    ttfb,
    totalTime,
    style,
    showMetrics = true,
    barColor = '#4A90E2',
    backgroundColor = '#E8E8E8',
    height = 4,
  }: StreamingProgressBarProps) => {
    // Animate progress bar width
    const animatedWidth = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
      Animated.timing(animatedWidth, {
        toValue: progress,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }, [progress, animatedWidth]);

    const widthInterpolation = animatedWidth.interpolate({
      inputRange: [0, 100],
      outputRange: ['0%', '100%'],
    });

    if (!isStreaming && progress === 0) {
      return null;
    }

    return (
      <View style={[styles.container, style]}>
        <View
          style={[
            styles.progressContainer,
            { height, backgroundColor },
          ]}
        >
          <Animated.View
            style={[
              styles.progressBar,
              { width: widthInterpolation, backgroundColor: barColor },
            ]}
          />
        </View>

        {showMetrics && (
          <View style={styles.metricsContainer}>
            <Text style={styles.progressText}>
              {Math.round(progress)}%
              {chunkCount > 0 && ` • ${chunkCount} items`}
            </Text>

            {ttfb && (
              <Text style={styles.ttfbText}>
                ⚡ TTFB: {ttfb}ms
              </Text>
            )}

            {totalTime && !isStreaming && (
              <Text style={styles.metricText}>
                Total: {(totalTime / 1000).toFixed(1)}s
              </Text>
            )}
          </View>
        )}
      </View>
    );
  }
);

StreamingProgressBar.displayName = 'StreamingProgressBar';
