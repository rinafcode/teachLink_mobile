import { useFocusEffect } from '@react-navigation/native';
import { usePathname } from 'expo-router';
import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, FlatList } from 'react-native';

import { scrollPositionService } from '../services/scrollPositionService';
import logger from '../utils/logger';

export interface UseFlatListScrollRestorationOptions {
  /**
   * Unique identifier for the screen. If not provided, uses current pathname.
   */
  screenId?: string;

  /**
   * Debounce delay for saving scroll position (ms)
   * @default 500
   */
  saveDelay?: number;

  /**
   * Threshold for minimum scroll distance before saving (px)
   * @default 50
   */
  minDistanceThreshold?: number;

  /**
   * Optional callback when scroll position is restored
   */
  onRestored?: (offset: number) => void;

  /**
   * Optional callback when scroll position changes
   */
  onChange?: (offset: number) => void;

  /**
   * Animated value for tracking scroll position
   */
  animatedValue?: Animated.Value;

  /**
   * Clear saved position when list data changes
   * Useful if list content is dynamic and position may become invalid
   * @default true
   */
  clearOnDataChange?: boolean;
}

/**
 * Hook for managing scroll position restoration with FlatList
 *
 * Features:
 * - Works with FlatList and SectionList components
 * - Detects data changes and clears invalid positions
 * - Handles fast scrolling smoothly
 * - Supports Animated values for UI effects
 *
 * Usage:
 * ```tsx
 * const { onScroll, onScrollToIndexFailed } = useFlatListScrollRestoration(
 *   flatListRef,
 *   { screenId: 'courses', clearOnDataChange: true }
 * );
 *
 * <FlatList
 *   ref={flatListRef}
 *   data={data}
 *   onScroll={onScroll}
 *   scrollEventThrottle={16}
 * />
 * ```
 */
export const useFlatListScrollRestoration = (
  flatListRef: React.RefObject<FlatList>,
  options: UseFlatListScrollRestorationOptions = {}
) => {
  const pathname = usePathname();
  const screenId = options.screenId || pathname || 'unknown';
  const saveDelay = options.saveDelay ?? 500;
  const minDistanceThreshold = options.minDistanceThreshold ?? 50;
  const clearOnDataChange = options.clearOnDataChange !== false;

  const lastSavedOffsetRef = useRef<number>(0);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const contentHeightRef = useRef<number>(0);
  const isFirstLoadRef = useRef(true);

  // Handle scroll events
  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number }; contentSize: { height: number } } }) => {
      const offset = event.nativeEvent.contentOffset.y;
      const contentHeight = event.nativeEvent.contentSize.height;

      // Update content height tracking
      if (contentHeight !== contentHeightRef.current && clearOnDataChange) {
        // Content changed - clear old position to prevent invalid restores
        if (contentHeightRef.current > 0) {
          logger.debug(`FlatList content changed for ${screenId}, clearing position`);
          scrollPositionService.clearPosition(screenId).catch((e) =>
            logger.error('Failed to clear position on data change', e)
          );
          lastSavedOffsetRef.current = 0;
        }
        contentHeightRef.current = contentHeight;
      }

      // Update animated value if provided
      if (options.animatedValue) {
        options.animatedValue.setValue(offset);
      }

      // Call onChange callback
      options.onChange?.(offset);

      // Check if scroll distance is significant
      const distance = Math.abs(offset - lastSavedOffsetRef.current);
      if (distance < minDistanceThreshold) {
        return;
      }

      // Clear previous timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Debounced save
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await scrollPositionService.savePosition(screenId, offset);
          lastSavedOffsetRef.current = offset;
          logger.debug(`Saved FlatList scroll position for ${screenId}: ${offset}px`);
        } catch (error) {
          logger.error('Failed to save FlatList position', error);
        }
      }, saveDelay);
    },
    [screenId, saveDelay, minDistanceThreshold, clearOnDataChange, options]
  );

  // Handle restoration on focus
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const saved = await scrollPositionService.getPosition(screenId);

          if (saved && !isFirstLoadRef.current) {
            logger.debug(`Restoring FlatList scroll for ${screenId}: ${saved.offset}px`);

            setTimeout(() => {
              if (flatListRef.current) {
                flatListRef.current.scrollToOffset({
                  offset: saved.offset,
                  animated: false,
                });

                if (options.animatedValue) {
                  options.animatedValue.setValue(saved.offset);
                }

                options.onRestored?.(saved.offset);
              }
            }, 0);
          } else if (isFirstLoadRef.current) {
            isFirstLoadRef.current = false;
            if (flatListRef.current) {
              flatListRef.current.scrollToOffset({ offset: 0, animated: false });
            }
          }
        } catch (error) {
          logger.error('Failed to restore FlatList position', error);
        }
      })();

      return () => {
        // Cleanup on unfocus
      };
    }, [screenId, flatListRef, options])
  );

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Callback for when scrollToIndex fails (index out of bounds)
   * Can be used to handle restore failures gracefully
   */
  const handleScrollToIndexFailed = useCallback(
    (error: { index: number; highestMeasuredFrameIndex: number; averageItemLength: number }) => {
      logger.warn(`ScrollToIndex failed for ${screenId}:`, error);
      // Clear position if index becomes invalid
      scrollPositionService
        .clearPosition(screenId)
        .catch((e) => logger.error('Failed to clear position on index failure', e));
    },
    [screenId]
  );

  return { onScroll: handleScroll, onScrollToIndexFailed: handleScrollToIndexFailed };
};
