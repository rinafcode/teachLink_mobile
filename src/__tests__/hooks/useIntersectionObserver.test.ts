/**
 * Tests for useIntersectionObserver.
 *
 * React Native's test environment uses string mocks for native components, so
 * `viewRef.current` after renderHook is a real React element handle — but
 * `measure` must be injected because no native layout engine runs in Jest.
 *
 * Strategy: after each renderHook call we directly set `viewRef.current` to an
 * object with a controllable `measure` stub, then fire `onScroll` and advance
 * the debounce timer.
 */
import { act, renderHook } from '@testing-library/react-native';

import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a fake `measure` implementation that synchronously calls the callback
 * with the supplied values. `pageY` is the absolute y-position of the view on
 * the screen (as returned by the real RN `measure` API).
 */
function makeMeasure(pageY: number, height: number) {
  return jest.fn(
    (cb: (x: number, y: number, w: number, h: number, px: number, py: number) => void) =>
      cb(0, 0, 100, height, 0, pageY)
  );
}

/**
 * Replace `viewRef.current` with a fake View object whose `measure` method
 * is controlled by the test. Returns the mock so tests can introspect calls.
 */
function injectMeasure(viewRef: React.RefObject<any>, pageY: number, height: number) {
  const measure = makeMeasure(pageY, height);
  // Force-write current — React's RefObject<T>.current is readonly at the type
  // level but writable at runtime (it's a plain object property).
  (viewRef as React.MutableRefObject<any>).current = { measure };
  return measure;
}

/**
 * Simulate a ScrollView scroll event and flush the debounce timer.
 */
function simulateScroll(
  onScroll: ReturnType<typeof useIntersectionObserver>['onScroll'],
  scrollY: number
) {
  act(() => {
    onScroll({
      nativeEvent: { contentOffset: { y: scrollY, x: 0 } },
    } as any);
    jest.runAllTimers();
  });
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useIntersectionObserver', () => {
  // -------------------------------------------------------------------------
  it('returns isVisible: false before any measurement', () => {
    const { result } = renderHook(() => useIntersectionObserver());
    // Nothing has fired yet.
    expect(result.current.isVisible).toBe(false);
  });

  // -------------------------------------------------------------------------
  it('returns a stable viewRef and onScroll across re-renders', () => {
    const { result, rerender } = renderHook(() => useIntersectionObserver());
    const ref1 = result.current.viewRef;
    const scroll1 = result.current.onScroll;

    rerender({});

    expect(result.current.viewRef).toBe(ref1);
    expect(result.current.onScroll).toBe(scroll1);
  });

  // -------------------------------------------------------------------------
  it('sets isVisible: true when the view is within the viewport', () => {
    const { result } = renderHook(() => useIntersectionObserver({ threshold: 0.5 }));

    // View at pageY=100, height=200, well within a 844-px viewport at scroll=0.
    injectMeasure(result.current.viewRef, 100, 200);
    simulateScroll(result.current.onScroll, 0);

    expect(result.current.isVisible).toBe(true);
  });

  // -------------------------------------------------------------------------
  it('sets isVisible: false when the view is scrolled out of viewport', () => {
    const { result } = renderHook(() => useIntersectionObserver({ threshold: 0.5 }));

    // Bring into view first
    injectMeasure(result.current.viewRef, 100, 200);
    simulateScroll(result.current.onScroll, 0);
    expect(result.current.isVisible).toBe(true);

    // Scroll down so the view is entirely above the viewport.
    // pageY stays the same (absolute screen position) but scroll moves past it.
    // When scrollY=400 and pageY=100, height=200:
    //   viewportTop=400, viewportBottom=1244 (400+844)
    //   intersectTop=max(400,100)=400, intersectBottom=min(1244,300)=300 → 0
    // → ratio=0, not visible at threshold=0.5
    //
    // Easiest: move the view off-screen by giving it a pageY below viewport.
    injectMeasure(result.current.viewRef, -300, 200); // pageY=-300 → above viewport
    simulateScroll(result.current.onScroll, 0);

    expect(result.current.isVisible).toBe(false);
  });

  // -------------------------------------------------------------------------
  it('respects threshold: 0 (any intersection counts)', () => {
    const { result } = renderHook(() => useIntersectionObserver({ threshold: 0 }));

    // View at pageY=840, height=200. Only 844-840=4 px visible (2%).
    // threshold=0 means ratio≥0 → visible for any intersection.
    injectMeasure(result.current.viewRef, 840, 200);
    simulateScroll(result.current.onScroll, 0);

    expect(result.current.isVisible).toBe(true);
  });

  // -------------------------------------------------------------------------
  it('respects threshold: 1 (full view must be visible)', () => {
    const { result } = renderHook(() => useIntersectionObserver({ threshold: 1 }));

    // View at pageY=700, height=200. Only 844-700=144px visible of 200 (72%).
    // With threshold=1, should NOT be visible.
    injectMeasure(result.current.viewRef, 700, 200);
    simulateScroll(result.current.onScroll, 0);

    expect(result.current.isVisible).toBe(false);
  });

  // -------------------------------------------------------------------------
  it('expands viewport by positive rootMargin', () => {
    const { result } = renderHook(() =>
      useIntersectionObserver({ threshold: 0.5, rootMargin: 200 })
    );

    // View at pageY=900, height=100.
    // Without rootMargin: viewport=0..844, view=900..1000 → no intersection.
    // With rootMargin=200: viewport=-200..1044 → full intersection.
    injectMeasure(result.current.viewRef, 900, 100);
    simulateScroll(result.current.onScroll, 0);

    expect(result.current.isVisible).toBe(true);
  });

  // -------------------------------------------------------------------------
  it('shrinks viewport with negative rootMargin', () => {
    const { result } = renderHook(() =>
      useIntersectionObserver({ threshold: 1, rootMargin: -200 })
    );

    // View at pageY=0, height=100. Viewport shrunken by 200 on each edge:
    //   viewportTop=200, viewportBottom=644 → view at 0..100, no intersection.
    injectMeasure(result.current.viewRef, 0, 100);
    simulateScroll(result.current.onScroll, 0);

    expect(result.current.isVisible).toBe(false);
  });

  // -------------------------------------------------------------------------
  it('does nothing when enabled: false', () => {
    const { result } = renderHook(() => useIntersectionObserver({ enabled: false }));

    injectMeasure(result.current.viewRef, 0, 200);
    simulateScroll(result.current.onScroll, 0);

    expect(result.current.isVisible).toBe(false);
  });

  // -------------------------------------------------------------------------
  it('clears pending timers on unmount (no state-after-unmount warning)', () => {
    const { result, unmount } = renderHook(() => useIntersectionObserver());

    injectMeasure(result.current.viewRef, 0, 200);

    // Queue a debounced measurement without letting it fire.
    act(() => {
      result.current.onScroll({
        nativeEvent: { contentOffset: { y: 0, x: 0 } },
      } as any);
    });

    // Unmount before debounce fires — should not warn about state after unmount.
    unmount();

    act(() => {
      jest.runAllTimers();
    });
  });

  // -------------------------------------------------------------------------
  it('does not update state when view has zero height', () => {
    const { result } = renderHook(() => useIntersectionObserver());

    // height=0 → skip measurement, stay false
    injectMeasure(result.current.viewRef, 0, 0);
    simulateScroll(result.current.onScroll, 0);

    expect(result.current.isVisible).toBe(false);
  });

  // -------------------------------------------------------------------------
  it('debounces rapid consecutive scroll events', () => {
    const { result } = renderHook(() => useIntersectionObserver());

    const measure = injectMeasure(result.current.viewRef, 0, 200);

    act(() => {
      // Fire 5 scroll events in quick succession without advancing timers
      for (let i = 0; i < 5; i++) {
        result.current.onScroll({
          nativeEvent: { contentOffset: { y: i * 10, x: 0 } },
        } as any);
      }
      // Advance all timers — the 5 debounced events collapse into 1 call,
      // plus 1 call from the initial mount effect timer = 2 total at most.
      jest.runAllTimers();
    });

    // All 5 rapid scroll events should collapse to a single debounced measurement
    // (the mount timer may add one more, so total ≤ 2 rather than exactly 5).
    expect(measure.mock.calls.length).toBeLessThanOrEqual(2);
  });
});
