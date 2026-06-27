import { useCallback, useEffect, useRef, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { appLogger } from '../utils/logger';

import type { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface UseIntersectionObserverOptions {
  /**
   * Fraction (0–1) of the observed View that must lie inside the scroll
   * viewport before `isVisible` flips to `true`.
   * @default 0.5
   */
  threshold?: number;

  /**
   * Extra pixels to expand the viewport on every edge.
   * Positive values make items "visible" slightly before they scroll on-screen
   * (useful for pre-loading); negative values require more scroll.
   * @default 0
   */
  rootMargin?: number;

  /**
   * Set to `false` to disable all observation. `isVisible` will stay `false`.
   * Handy for toggling the hook without removing it from the component tree.
   * @default true
   */
  enabled?: boolean;
}

export interface UseIntersectionObserverReturn {
  /** Attach this ref to the `View` you want to observe. */
  viewRef: React.RefObject<View>;

  /**
   * `true` when at least `threshold` of the observed View is inside the
   * scroll viewport (± `rootMargin`).
   */
  isVisible: boolean;

  /**
   * Attach this handler to the **parent `ScrollView`'s `onScroll`** prop.
   * The hook only measures the view position on scroll events, so the parent
   * must forward its scroll offsets here.
   *
   * ```tsx
   * <ScrollView onScroll={onScroll} scrollEventThrottle={16}>
   *   <MyComponent viewRef={viewRef} />
   * </ScrollView>
   * ```
   */
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

const DEFAULT_THRESHOLD = 0.5;
const DEFAULT_ROOT_MARGIN = 0;
const MEASURE_DEBOUNCE_MS = 100;

/**
 * Tracks whether a `View` is currently visible inside its parent `ScrollView`.
 *
 * React Native has no browser-native `IntersectionObserver`. This hook
 * replicates the same semantics using:
 *   - `View.measure()` to read the absolute position of the observed element.
 *   - The parent `ScrollView`'s `onScroll` event to know the current offset.
 *   - `useWindowDimensions` to know the viewport height.
 *
 * ### Usage
 * ```tsx
 * function MyScreen() {
 *   const { viewRef, isVisible, onScroll } = useIntersectionObserver();
 *
 *   return (
 *     <ScrollView onScroll={onScroll} scrollEventThrottle={16}>
 *       <View ref={viewRef}>
 *         <HeavyComponent paused={!isVisible} />
 *       </View>
 *     </ScrollView>
 *   );
 * }
 * ```
 */
export function useIntersectionObserver(
  opts: UseIntersectionObserverOptions = {}
): UseIntersectionObserverReturn {
  const { threshold = DEFAULT_THRESHOLD, rootMargin = DEFAULT_ROOT_MARGIN, enabled = true } = opts;

  const { height: windowHeight } = useWindowDimensions();

  const viewRef = useRef<View>(null);
  const scrollYRef = useRef<number>(0);
  const isMeasuringRef = useRef<boolean>(false);
  const pendingMeasureRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isVisible, setIsVisible] = useState<boolean>(false);

  // -------------------------------------------------------------------------
  // Core measurement — called after every scroll event (debounced)
  // -------------------------------------------------------------------------
  const measureVisibility = useCallback(() => {
    if (!enabled || !viewRef.current) {
      return;
    }

    if (isMeasuringRef.current) {
      // A measure call is already in flight; schedule a follow-up instead of
      // queuing another native call.
      return;
    }

    isMeasuringRef.current = true;

    viewRef.current.measure((_x, _y, _width, height, _pageX, pageY) => {
      isMeasuringRef.current = false;

      if (height <= 0) {
        // View is not yet laid out or has zero height — treat as not visible.
        setIsVisible(false);
        return;
      }

      const scrollY = scrollYRef.current;

      // Viewport bounds (adjusted by rootMargin)
      const viewportTop = scrollY - rootMargin;
      const viewportBottom = scrollY + windowHeight + rootMargin;

      // View bounds in absolute coordinates (pageY is relative to the screen)
      const itemTop = pageY;
      const itemBottom = pageY + height;

      // Intersection
      const intersectTop = Math.max(viewportTop, itemTop);
      const intersectBottom = Math.min(viewportBottom, itemBottom);
      const intersectHeight = Math.max(0, intersectBottom - intersectTop);

      const ratio = intersectHeight / height;
      const visible = ratio >= threshold;

      setIsVisible(prev => {
        if (prev === visible) return prev; // avoid unnecessary re-renders
        appLogger.debug('useIntersectionObserver visibility changed', {
          visible,
          ratio: Math.round(ratio * 100) / 100,
          threshold,
        });
        return visible;
      });
    });
  }, [enabled, rootMargin, threshold, windowHeight]);

  // -------------------------------------------------------------------------
  // Scroll handler — debounced to MEASURE_DEBOUNCE_MS
  // -------------------------------------------------------------------------
  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollYRef.current = event.nativeEvent.contentOffset.y;

      if (pendingMeasureRef.current !== null) {
        clearTimeout(pendingMeasureRef.current);
      }

      pendingMeasureRef.current = setTimeout(measureVisibility, MEASURE_DEBOUNCE_MS);
    },
    [measureVisibility]
  );

  // -------------------------------------------------------------------------
  // Initial measurement after layout
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!enabled) {
      setIsVisible(false);
      return;
    }

    // Trigger an initial measurement once the view has laid out.
    const initialTimer = setTimeout(measureVisibility, MEASURE_DEBOUNCE_MS);
    return () => clearTimeout(initialTimer);
  }, [enabled, measureVisibility]);

  // -------------------------------------------------------------------------
  // Cleanup on unmount
  // -------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      if (pendingMeasureRef.current !== null) {
        clearTimeout(pendingMeasureRef.current);
      }
    };
  }, []);

  return { viewRef, isVisible, onScroll };
}
