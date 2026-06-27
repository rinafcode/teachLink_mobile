import { act, renderHook } from '@testing-library/react-native';

import {
  useViewabilityCallback,
  type ViewableItemsChangedInfo,
} from '../../hooks/useViewabilityCallback';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a fake ViewToken as React Native would produce it. */
function token(key: string, isViewable: boolean, index: number = 0) {
  return { key, isViewable, index, item: {}, timestamp: Date.now() };
}

/** Fire onViewableItemsChanged with the given changed tokens. */
function fireChanged(
  onViewableItemsChanged: (info: ViewableItemsChangedInfo) => void,
  changed: ReturnType<typeof token>[]
) {
  act(() => {
    onViewableItemsChanged({
      viewableItems: changed.filter(t => t.isViewable),
      changed,
    });
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useViewabilityCallback', () => {
  // -------------------------------------------------------------------------
  describe('viewabilityConfig', () => {
    it('defaults to 50 % threshold and 250 ms minimumViewTime', () => {
      const { result } = renderHook(() => useViewabilityCallback());
      expect(result.current.viewabilityConfig.itemVisiblePercentThreshold).toBe(50);
      expect(result.current.viewabilityConfig.minimumViewTime).toBe(250);
    });

    it('respects custom itemVisiblePercentThreshold', () => {
      const { result } = renderHook(() =>
        useViewabilityCallback({ itemVisiblePercentThreshold: 80 })
      );
      expect(result.current.viewabilityConfig.itemVisiblePercentThreshold).toBe(80);
    });

    it('respects custom minimumViewTime', () => {
      const { result } = renderHook(() => useViewabilityCallback({ minimumViewTime: 1000 }));
      expect(result.current.viewabilityConfig.minimumViewTime).toBe(1000);
    });

    it('returns the same viewabilityConfig object reference across re-renders', () => {
      const { result, rerender } = renderHook(() => useViewabilityCallback());
      const cfg1 = result.current.viewabilityConfig;
      rerender({});
      expect(result.current.viewabilityConfig).toBe(cfg1);
    });
  });

  // -------------------------------------------------------------------------
  describe('onViewableItemsChanged', () => {
    it('returns the same callback reference across re-renders', () => {
      const { result, rerender } = renderHook(() => useViewabilityCallback());
      const cb1 = result.current.onViewableItemsChanged;
      rerender({});
      expect(result.current.onViewableItemsChanged).toBe(cb1);
    });
  });

  // -------------------------------------------------------------------------
  describe('visibleItemKeys', () => {
    it('starts empty', () => {
      const { result } = renderHook(() => useViewabilityCallback());
      expect(result.current.visibleItemKeys.size).toBe(0);
    });

    it('adds keys when items become viewable', () => {
      const { result } = renderHook(() => useViewabilityCallback());

      fireChanged(result.current.onViewableItemsChanged, [
        token('item-1', true),
        token('item-2', true),
      ]);

      expect(result.current.visibleItemKeys.has('item-1')).toBe(true);
      expect(result.current.visibleItemKeys.has('item-2')).toBe(true);
    });

    it('removes keys when items leave the viewport', () => {
      const { result } = renderHook(() => useViewabilityCallback());

      // Bring two items into view
      fireChanged(result.current.onViewableItemsChanged, [
        token('item-1', true),
        token('item-2', true),
      ]);
      expect(result.current.visibleItemKeys.size).toBe(2);

      // Scroll item-1 off screen
      fireChanged(result.current.onViewableItemsChanged, [token('item-1', false)]);
      expect(result.current.visibleItemKeys.has('item-1')).toBe(false);
      expect(result.current.visibleItemKeys.has('item-2')).toBe(true);
    });

    it('handles an empty changed array without throwing', () => {
      const { result } = renderHook(() => useViewabilityCallback());
      expect(() => fireChanged(result.current.onViewableItemsChanged, [])).not.toThrow();
      expect(result.current.visibleItemKeys.size).toBe(0);
    });

    it('does not produce a new Set reference when nothing changed', () => {
      const { result } = renderHook(() => useViewabilityCallback());

      // Add an item
      fireChanged(result.current.onViewableItemsChanged, [token('item-1', true)]);
      const ref1 = result.current.visibleItemKeys;

      // Fire an event for the same item that is still viewable (no actual change)
      fireChanged(result.current.onViewableItemsChanged, [token('item-1', true)]);
      const ref2 = result.current.visibleItemKeys;

      // The Set reference should be identical since nothing changed.
      expect(ref2).toBe(ref1);
    });

    it('handles tokens without a key by falling back to index string', () => {
      const { result } = renderHook(() => useViewabilityCallback());

      act(() => {
        result.current.onViewableItemsChanged({
          viewableItems: [],
          // Omit key to exercise the index fallback
          changed: [{ key: undefined as any, isViewable: true, index: 3, item: {}, timestamp: 0 }],
        });
      });

      expect(result.current.visibleItemKeys.has('3')).toBe(true);
    });

    it('handles multiple rapid changes correctly', () => {
      const { result } = renderHook(() => useViewabilityCallback());

      // Fast scroll through 5 items
      for (let i = 0; i < 5; i++) {
        fireChanged(result.current.onViewableItemsChanged, [token(`item-${i}`, true)]);
      }
      for (let i = 0; i < 3; i++) {
        fireChanged(result.current.onViewableItemsChanged, [token(`item-${i}`, false)]);
      }

      expect(result.current.visibleItemKeys.has('item-0')).toBe(false);
      expect(result.current.visibleItemKeys.has('item-1')).toBe(false);
      expect(result.current.visibleItemKeys.has('item-2')).toBe(false);
      expect(result.current.visibleItemKeys.has('item-3')).toBe(true);
      expect(result.current.visibleItemKeys.has('item-4')).toBe(true);
    });
  });
});
