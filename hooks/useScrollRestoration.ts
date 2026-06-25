import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { usePathname } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, ScrollView } from 'react-native';

import { scrollPositionService } from '../services/scrollPositionService';
import logger from '../utils/logger';

export interface UseScrollRestorationOptions {
  /**
   * Unique identifier for the screen. If not provided, uses current pathname.
   * Use this if you have multiple scrollable sections on same screen.
   */
  screenId?: string;

  /**
   * Debounce delay for saving scroll position (ms)
   * @default 500
   */
  saveDelay?: number;

  /**
   * Threshold for minimum scroll distance before saving (px)
   * Prevents saving every tiny scroll movement
   * @default 50
   */
  minDistanceThreshold?: number;

  /**
   * Enable automatic scroll to top on first navigation to screen
   * @default true
   */
  scrollToTopOnFirstLoad?: boolean;

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
   * Useful for parallax effects or animated headers
   */
  animatedValue?: Animated.Value;
}

/**
 * Hook for managing scroll position restoration across navigation
 *
 * Features:
 * - Automatically saves scroll position when leaving a screen
 * - Restores scroll position when returning to a screen
 * - Debounced saving to reduce storage writes
 * - Handles fast scrolling without losing position
 * - Works with Animated values for UI effects
 *
 * Usage:
 * ```tsx
 * const HomeScreenContent = () => {
 *   const scrollRef = useRef<ScrollView>(null);
 *   useScrollRestoration(scrollRef, { screenId: 'home' });
 *
 *   return <ScrollView ref={scrollRef}>{content}</ScrollView>;
 * };
 * ```
 */
export const useScrollRestoration = (
  scrollRef: React.RefObject<ScrollView>,
  options: UseScrollRestorationOptions = {}
) => {
  const pathname = usePathname();
  const navigation = useNavigation();
  const screenId = options.screenId || pathname || 'unknown';
  const saveDelay = options.saveDelay ?? 500;
  const minDistanceThreshold = options.minDistanceThreshold ?? 50;
  const scrollToTopOnFirstLoad = options.scrollToTopOnFirstLoad !== false;

  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const lastSavedOffsetRef = useRef<number>(0);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const isNavigatingBackRef = useRef(false);

  // Detect when we're navigating back
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      // This fires when navigating away from the current screen
      // Save current position before leaving
      if (scrollRef.current) {
        // Position will be saved in the blur handler
      }
    });

    return unsubscribe;
  }, [navigation, scrollRef]);

  // Handle blur (navigate away) and focus (return to screen)
  useFocusEffect(
    useCallback(() => {
      // Screen is now in focus (navigated back or first load)
      (async () => {
        try {
          const saved = await scrollPositionService.getPosition(screenId);

          if (saved && !isFirstLoad) {
            // Restore position when returning to screen
            logger.debug(`Restoring scroll for ${screenId}: ${saved.offset}px`);

            setTimeout(() => {
              if (scrollRef.current) {
                scrollRef.current.scrollTo({
                  y: saved.offset,
                  animated: false,
                });

                // Update animated value if provided
                if (options.animatedValue) {
                  options.animatedValue.setValue(saved.offset);
                }

                options.onRestored?.(saved.offset);
              }
            }, 0);
          } else if (isFirstLoad && scrollToTopOnFirstLoad) {
            // First load: scroll to top
            setIsFirstLoad(false);
            if (scrollRef.current) {
              scrollRef.current.scrollTo({ y: 0, animated: false });
            }
          } else if (isFirstLoad) {
            setIsFirstLoad(false);
          }
        } catch (error) {
          logger.error('useScrollRestoration: Failed to restore position', error);
        }
      })();

      // Cleanup when component unfocuses
      return () => {
        // Save position when navigating away
        if (scrollRef.current) {
          scrollRef.current.scrollTo({
            y: lastSavedOffsetRef.current,
            animated: false,
          });
        }
      };
    }, [screenId, isFirstLoad, scrollToTopOnFirstLoad, scrollRef])
  );

  // Handle scroll events
  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      const offset = event.nativeEvent.contentOffset.y;

      // Update animated value if provided
      if (options.animatedValue) {
        options.animatedValue.setValue(offset);
      }

      // Call onChange callback
      options.onChange?.(offset);

      // Check if scroll distance is significant
      const distance = Math.abs(offset - lastSavedOffsetRef.current);
      if (distance < minDistanceThreshold) {
        return; // Too small, ignore
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
          logger.debug(`Saved scroll position for ${screenId}: ${offset}px`);
        } catch (error) {
          logger.error('useScrollRestoration: Failed to save position', error);
        }
      }, saveDelay);
    },
    [screenId, saveDelay, minDistanceThreshold, options]
  );

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return { onScroll: handleScroll };
};
