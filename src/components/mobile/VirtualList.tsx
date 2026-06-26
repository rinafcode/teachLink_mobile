import React, { useCallback } from 'react';
import { FlatList, FlatListProps, ViewStyle, StyleProp } from 'react-native';
import { useMemoryMonitor } from '../../hooks';

/**
 * Explicit extension props for VirtualList.
 *
 * NOTE: Do NOT reintroduce `{...rest}` or generic prop spreading here.
 * All supported FlatList extension points must be listed explicitly.
 * See docs/prop-patterns.md.
 */

export interface VirtualListProps<T> extends Omit<FlatListProps<T>, 'renderItem'> {
  data: ReadonlyArray<T> | null | undefined;
  renderItem: FlatListProps<T>['renderItem'];
  keyExtractor: (item: T, index: number) => string;
  /** Optional: If items have fixed height, this drastically improves layout performance */
  itemHeight?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Optional ID for memory monitoring */
  listId?: string;
  /** Component rendered above the list items. */
  ListHeaderComponent?: FlatListProps<T>['ListHeaderComponent'];
  /** Component rendered when the list is empty. */
  ListEmptyComponent?: FlatListProps<T>['ListEmptyComponent'];
  /** Render horizontally instead of vertically. */
  horizontal?: boolean;
  /** Hide the vertical scroll indicator. */
  showsVerticalScrollIndicator?: boolean;
  /** Pull-to-refresh control. */
  refreshControl?: FlatListProps<T>['refreshControl'];
  /** Test identifier for automated tests. */
  testID?: string;
}

/**
 * A highly optimized wrapper for React Native's FlatList.
 * Configures optimal props for 60fps scrolling and interfaces with memory monitoring.
 */
export function VirtualList<T>({
  data,
  renderItem,
  keyExtractor,
  itemHeight,
  listId = 'VirtualList',
  contentContainerStyle,
  ListHeaderComponent,
  ListEmptyComponent,
  horizontal,
  showsVerticalScrollIndicator,
  refreshControl,
  testID,
}: VirtualListProps<T>) {
  // Monitor memory footprint based on list size
  useMemoryMonitor({
    componentId: listId,
    itemCount: data?.length || 0,
    thresholdWarning: 100, // Warn if list gets too large without windowing
  });

  const getItemLayout = useCallback(
    (data: ArrayLike<T> | null | undefined, index: number) => {
      return { length: itemHeight!, offset: itemHeight! * index, index };
    },
    [itemHeight]
  );

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={itemHeight ? getItemLayout : undefined}
      // Performance optimizations:
      removeClippedSubviews={true} // Unmount components lying outside of the window
      initialNumToRender={10} // Reduce initial render time
      maxToRenderPerBatch={10} // Reduce number of items rendered per batch
      windowSize={5} // Reduce the size of the render window (default 21)
      updateCellsBatchingPeriod={50} // Delay in ms between batch renders
      contentContainerStyle={contentContainerStyle}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      horizontal={horizontal}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      refreshControl={refreshControl}
      testID={testID}
    />
  );
}
