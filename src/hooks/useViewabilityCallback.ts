import { useRef, useState } from 'react';

import type { ViewabilityConfig, ViewToken } from 'react-native';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface UseViewabilityCallbackOptions {
  /**
   * Percentage of the item (0–100) that must be visible before it is counted
   * as "viewable". Passed directly to React Native's `ViewabilityConfig`.
   * @default 50
   */
  itemVisiblePercentThreshold?: number;

  /**
   * Minimum time (ms) the item must remain visible before being considered
   * "viewable". Guards against fast-scroll flicker.
   * @default 250
   */
  minimumViewTime?: number;
}

/** Shape of the argument React Native passes to `onViewableItemsChanged`. */
export interface ViewableItemsChangedInfo {
  viewableItems: ViewToken[];
  changed: ViewToken[];
}

export interface UseViewabilityCallbackReturn {
  /**
   * A stable `ViewabilityConfig` object. Pass this (wrapped in an array with
   * `onViewableItemsChanged`) to FlatList's `viewabilityConfigCallbackPairs`.
   */
  viewabilityConfig: ViewabilityConfig;

  /**
   * A stable callback that updates `visibleItemKeys` whenever the set of
   * visible items changes. Pass this alongside `viewabilityConfig`.
   */
  onViewableItemsChanged: (info: ViewableItemsChangedInfo) => void;

  /**
   * The set of item `key` strings that are currently visible in the list.
   * Individual row components can check `visibleItemKeys.has(myKey)` to decide
   * whether to pause/resume their activity.
   *
   * The Set reference changes on every update, so downstream components should
   * read `.has()` inside a render — not compare the Set by reference.
   */
  visibleItemKeys: ReadonlySet<string>;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

const DEFAULT_PERCENT_THRESHOLD = 50;
const DEFAULT_MIN_VIEW_TIME = 250;

/**
 * FlatList-oriented companion to `useIntersectionObserver`.
 *
 * Wraps React Native's `ViewabilityConfig` + `onViewableItemsChanged` and
 * exposes a `Set<string>` of currently-visible item keys so that individual
 * row components can pause/resume their own activity without re-rendering the
 * entire list.
 *
 * ### Usage
 * ```tsx
 * function VideoFeed({ items }: { items: VideoItem[] }) {
 *   const { viewabilityConfig, onViewableItemsChanged, visibleItemKeys } =
 *     useViewabilityCallback();
 *
 *   const viewabilityConfigCallbackPairs = useRef([
 *     { viewabilityConfig, onViewableItemsChanged },
 *   ]);
 *
 *   return (
 *     <FlatList
 *       data={items}
 *       keyExtractor={item => item.id}
 *       viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs.current}
 *       renderItem={({ item }) => (
 *         <OptimizedVideoPlayer
 *           uri={item.videoUri}
 *           autoPlay
 *           isVisible={visibleItemKeys.has(item.id)}
 *         />
 *       )}
 *     />
 *   );
 * }
 * ```
 *
 * ### Why stable refs?
 * FlatList will emit a warning (and potentially reset scroll position) if
 * `viewabilityConfig` or `onViewableItemsChanged` change between renders.
 * Both are therefore created once via `useRef` and never replaced.
 */
export function useViewabilityCallback(
  opts: UseViewabilityCallbackOptions = {}
): UseViewabilityCallbackReturn {
  const {
    itemVisiblePercentThreshold = DEFAULT_PERCENT_THRESHOLD,
    minimumViewTime = DEFAULT_MIN_VIEW_TIME,
  } = opts;

  // Build the ViewabilityConfig once and freeze it.
  const viewabilityConfigRef = useRef<ViewabilityConfig>({
    itemVisiblePercentThreshold,
    minimumViewTime,
    waitForInteraction: false,
  });

  const [visibleItemKeys, setVisibleItemKeys] = useState<ReadonlySet<string>>(new Set<string>());

  // Store the setter in a ref so the stable callback below can always access
  // the latest version without being re-created.
  const setterRef = useRef(setVisibleItemKeys);
  setterRef.current = setVisibleItemKeys;

  // Stable callback — identity never changes, satisfying FlatList's contract.
  const onViewableItemsChanged = useRef((info: ViewableItemsChangedInfo) => {
    setterRef.current(prev => {
      const next = new Set<string>(prev);
      let changed = false;

      for (const token of info.changed) {
        const key = token.key ?? String(token.index ?? '');
        if (key === '') continue;

        if (token.isViewable) {
          if (!next.has(key)) {
            next.add(key);
            changed = true;
          }
        } else {
          if (next.has(key)) {
            next.delete(key);
            changed = true;
          }
        }
      }

      return changed ? next : prev;
    });
  }).current;

  return {
    viewabilityConfig: viewabilityConfigRef.current,
    onViewableItemsChanged,
    visibleItemKeys,
  };
}
