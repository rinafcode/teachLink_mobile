import React, { useCallback, useMemo } from 'react';
import {
  FlatList,
  FlatListProps,
  ActivityIndicator,
  View,
  StyleSheet,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import * as Device from 'expo-device';
import { useMemoryMonitor } from '../../hooks';

/**
 * Explicit extension props for InfiniteVirtualList.
 *
 * NOTE: Do NOT reintroduce `{...rest}` or generic prop spreading here.
 * All supported FlatList extension points must be listed explicitly.
 * See docs/prop-patterns.md.
 */
export interface InfiniteVirtualListProps<T> extends Omit<FlatListProps<T>, 'renderItem'> {
  /** The data items to display. */
  data: ReadonlyArray<T> | null | undefined;
  /** Custom renderer for list items. */
  renderItem: FlatListProps<T>['renderItem'];
  /** Extract a unique key for a given item. */
  keyExtractor: (item: T, index: number) => string;
  /** Optional fixed height of each list item. Bypasses layout measurement steps to achieve perfect 60fps. */
  itemHeight?: number;
  /** Boolean indicating if a new page/batch of items is actively loading. */
  loadingMore?: boolean;
  /** Callback fired when the scroll position nears the bottom. */
  onEndReached: () => void;
  /** Threshold at which onEndReached is triggered. Default is 0.2. */
  onEndReachedThreshold?: number;
  /** Unique ID used to trace memory footprint. */
  listId?: string;
  /** Custom styles for the scroll list wrapper. */
  style?: StyleProp<ViewStyle>;
  /** Custom styles for the inner scroll container. */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Component rendered above the list items. */
  ListHeaderComponent?: FlatListProps<T>['ListHeaderComponent'];
  /** Component rendered when the list is empty. */
  ListEmptyComponent?: FlatListProps<T>['ListEmptyComponent'];
  /** Render horizontally instead of vertically. */
  horizontal?: boolean;
  /** Hide the vertical scroll indicator. */
  showsVerticalScrollIndicator?: boolean;
  /** Hide the horizontal scroll indicator. */
  showsHorizontalScrollIndicator?: boolean;
  /** Pull-to-refresh control. */
  refreshControl?: FlatListProps<T>['refreshControl'];
  /** Scroll event throttle in milliseconds. */
  scrollEventThrottle?: number;
  /** Scroll event callback. */
  onScroll?: FlatListProps<T>['onScroll'];
  /** Test identifier for automated tests. */
  testID?: string;
}

/**
 * A highly optimized infinite-scroll list leveraging native view recycling (virtual scrolling).
 * Automatically profile device memory (total system RAM) to step down batch rendering parameters
 * on low-end devices (<2GB RAM), ensuring smooth scroll performance without memory leaks.
 */
export function InfiniteVirtualList<T>({
  data,
  renderItem,
  keyExtractor,
  itemHeight,
  loadingMore = false,
  onEndReached,
  onEndReachedThreshold = 0.2,
  listId = 'InfiniteVirtualList',
  style,
  contentContainerStyle,
  ListHeaderComponent,
  ListEmptyComponent,
  horizontal,
  showsVerticalScrollIndicator,
  showsHorizontalScrollIndicator,
  refreshControl,
  scrollEventThrottle,
  onScroll,
  testID,
}: InfiniteVirtualListProps<T>) {
  // Monitor JS collection array sizes
  useMemoryMonitor({
    componentId: listId,
    itemCount: data?.length || 0,
    thresholdWarning: 2000,
    thresholdCritical: 10000,
  });

  // Evaluate if system memory is low (<2GB) to step down parameters
  const isLowEndDevice = useMemo(() => {
    if (Platform.OS === 'web') return false;
    const memory = Device.totalMemory ?? 0;
    return memory > 0 && memory < 2 * 1024 * 1024 * 1024;
  }, []);

  // Performance parameters adapted dynamically
  const optimizations = useMemo(() => {
    if (isLowEndDevice) {
      return {
        windowSize: 3,                  // Minimum offscreen buffers
        maxToRenderPerBatch: 5,         // Prevent blocking UI thread
        initialNumToRender: 5,          // Quick render
        updateCellsBatchingPeriod: 100, // Yield more time back to native main thread
      };
    }
    return {
      windowSize: 5,
      maxToRenderPerBatch: 10,
      initialNumToRender: 10,
      updateCellsBatchingPeriod: 50,
    };
  }, [isLowEndDevice]);

  // Layout engine performance cheat-code (skips component measurement)
  const getItemLayout = useCallback(
    (_data: ArrayLike<T> | null | undefined, index: number) => {
      return { length: itemHeight!, offset: itemHeight! * index, index };
    },
    [itemHeight]
  );

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footer} testID="infinite-list-spinner">
        <ActivityIndicator size="small" color="#19c3e6" />
      </View>
    );
  }, [loadingMore]);

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={itemHeight ? getItemLayout : undefined}
      onEndReached={onEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      ListFooterComponent={renderFooter}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      // Performance configurations:
      removeClippedSubviews={true} // Free native memory by unmounting offscreen views
      style={style}
      contentContainerStyle={contentContainerStyle}
      horizontal={horizontal}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
      refreshControl={refreshControl}
      scrollEventThrottle={scrollEventThrottle}
      onScroll={onScroll}
      testID={testID}
      {...optimizations}
    />
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
