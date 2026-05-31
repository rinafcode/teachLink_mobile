import { useCallback, useRef } from 'react';

import type { GestureResponderEvent } from 'react-native';

/**
 * Touch event deduplication configuration
 */
export interface TouchDeduplicationConfig {
  /**
   * Time window in milliseconds to consider taps as duplicates.
   * Taps within this window at the same location are deduplicated.
   * @default 300
   */
  threshold?: number;

  /**
   * Distance in pixels to consider taps as being at the same location.
   * @default 10
   */
  coordinateTolerance?: number;

  /**
   * Optional callback fired when a duplicate tap is detected.
   * Useful for telemetry or debugging.
   */
  onDuplicate?: () => void;
}

/**
 * Tracks the last tap's timestamp and coordinates to deduplicate touch events.
 * Prevents accidental double-submissions and unintended actions.
 *
 * @example
 * const { dedupledHandler } = useTouchDeduplication(() => {
 *   // Submit form
 * });
 *
 * <TouchableOpacity onPress={dedupledHandler}>
 *   <Text>Submit</Text>
 * </TouchableOpacity>
 */
export function useTouchDeduplication<T extends (...args: any[]) => any>(
  handler: T,
  config: TouchDeduplicationConfig = {}
) {
  const { threshold = 300, coordinateTolerance = 10, onDuplicate } = config;

  const lastTapRef = useRef<{
    timestamp: number;
    x: number;
    y: number;
  } | null>(null);

  const isHandlerLocked = useRef(false);

  const dedupledHandler = useCallback(
    (event?: GestureResponderEvent) => {
      const now = Date.now();
      const currentX = event?.nativeEvent?.pageX ?? 0;
      const currentY = event?.nativeEvent?.pageY ?? 0;

      const lastTap = lastTapRef.current;

      // Check if this is a duplicate tap
      const isDuplicate =
        lastTap &&
        now - lastTap.timestamp < threshold &&
        Math.abs(currentX - lastTap.x) < coordinateTolerance &&
        Math.abs(currentY - lastTap.y) < coordinateTolerance;

      if (isDuplicate) {
        onDuplicate?.();
        return;
      }

      // Update last tap
      lastTapRef.current = {
        timestamp: now,
        x: currentX,
        y: currentY,
      };

      // Prevent concurrent execution during async operations
      if (isHandlerLocked.current) {
        return;
      }

      try {
        isHandlerLocked.current = true;
        const result = handler(event);

        // Handle async handlers
        if (result instanceof Promise) {
          result
            .finally(() => {
              isHandlerLocked.current = false;
            })
            .catch(() => {
              // Error already handled by caller
            });
        } else {
          isHandlerLocked.current = false;
        }
      } catch (error) {
        isHandlerLocked.current = false;
        throw error;
      }
    },
    [handler, threshold, coordinateTolerance, onDuplicate]
  );

  return { dedupledHandler };
}

/**
 * Creates a deduplicating wrapper for a handler function.
 * Similar to useTouchDeduplication but for use outside of React hooks.
 *
 * @example
 * const submitHandler = withTouchDeduplication(handleSubmit, { threshold: 300 });
 *
 * <TouchableOpacity onPress={submitHandler}>
 *   <Text>Submit</Text>
 * </TouchableOpacity>
 */
export function withTouchDeduplication<T extends (...args: any[]) => any>(
  handler: T,
  config: TouchDeduplicationConfig = {}
): T {
  const { threshold = 300, coordinateTolerance = 10, onDuplicate } = config;

  let lastTap: { timestamp: number; x: number; y: number } | null = null;
  let isHandlerLocked = false;

  return ((...args: any[]) => {
    const event = args[0] as GestureResponderEvent | undefined;
    const now = Date.now();
    const currentX = event?.nativeEvent?.pageX ?? 0;
    const currentY = event?.nativeEvent?.pageY ?? 0;

    // Check if this is a duplicate tap
    const isDuplicate =
      lastTap &&
      now - lastTap.timestamp < threshold &&
      Math.abs(currentX - lastTap.x) < coordinateTolerance &&
      Math.abs(currentY - lastTap.y) < coordinateTolerance;

    if (isDuplicate) {
      onDuplicate?.();
      return;
    }

    // Update last tap
    lastTap = {
      timestamp: now,
      x: currentX,
      y: currentY,
    };

    // Prevent concurrent execution during async operations
    if (isHandlerLocked) {
      return;
    }

    try {
      isHandlerLocked = true;
      const result = handler(...args);

      // Handle async handlers
      if (result instanceof Promise) {
        result
          .finally(() => {
            isHandlerLocked = false;
          })
          .catch(() => {
            // Error already handled by caller
          });
      } else {
        isHandlerLocked = false;
      }

      return result;
    } catch (error) {
      isHandlerLocked = false;
      throw error;
    }
  }) as T;
}
