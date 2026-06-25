import { renderHook, act } from '@testing-library/react-native';

import { useTouchDeduplication } from '../../src/hooks/useTouchDeduplication';

describe('useTouchDeduplication', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── isFreshTap — time-based deduplication ───────────────────────────────────

  describe('isFreshTap — time-based deduplication', () => {
    it('accepts the very first tap with no previous state', () => {
      const { result } = renderHook(() => useTouchDeduplication());

      act(() => {
        const accepted = result.current.isFreshTap({ x: 100, y: 200 });
        expect(accepted).toBe(true);
      });
    });

    it('rejects a second tap at the same location within 300 ms', () => {
      const { result } = renderHook(() => useTouchDeduplication());

      act(() => {
        result.current.isFreshTap({ x: 50, y: 50 }); // first tap — accepted
        jest.advanceTimersByTime(100); // 100 ms later
        const duplicate = result.current.isFreshTap({ x: 50, y: 50 });
        expect(duplicate).toBe(false);
      });
    });

    it('accepts a tap after 300 ms have elapsed (window expired)', () => {
      const { result } = renderHook(() => useTouchDeduplication());

      act(() => {
        result.current.isFreshTap({ x: 50, y: 50 });
        jest.advanceTimersByTime(300);
        const fresh = result.current.isFreshTap({ x: 50, y: 50 });
        expect(fresh).toBe(true);
      });
    });

    it('rejects tap at 299 ms but accepts at 300 ms (boundary)', () => {
      const { result } = renderHook(() => useTouchDeduplication());

      act(() => {
        result.current.isFreshTap({ x: 10, y: 10 });
        jest.advanceTimersByTime(299);
        expect(result.current.isFreshTap({ x: 10, y: 10 })).toBe(false);
      });

      act(() => {
        result.current.isFreshTap({ x: 10, y: 10 });
        jest.advanceTimersByTime(300);
        expect(result.current.isFreshTap({ x: 10, y: 10 })).toBe(true);
      });
    });
  });

  // ── isFreshTap — coordinate-based deduplication ────────────────────────────

  describe('isFreshTap — coordinate-based deduplication', () => {
    it('accepts a tap at a different location within 300 ms', () => {
      const { result } = renderHook(() => useTouchDeduplication());

      act(() => {
        result.current.isFreshTap({ x: 10, y: 10 });
        jest.advanceTimersByTime(50);
        // More than 10 px away → different location
        const differentLocation = result.current.isFreshTap({ x: 100, y: 100 });
        expect(differentLocation).toBe(true);
      });
    });

    it('rejects a tap within the 10 px radius at same time', () => {
      const { result } = renderHook(() => useTouchDeduplication());

      act(() => {
        result.current.isFreshTap({ x: 50, y: 50 });
        jest.advanceTimersByTime(50);
        // Within 10 px radius: distance = sqrt(4²+4²) ≈ 5.6 px
        const withinRadius = result.current.isFreshTap({ x: 54, y: 54 });
        expect(withinRadius).toBe(false);
      });
    });

    it('accepts a tap exactly on the radius boundary (> 10 px)', () => {
      const { result } = renderHook(() => useTouchDeduplication());

      act(() => {
        result.current.isFreshTap({ x: 0, y: 0 });
        jest.advanceTimersByTime(50);
        // distance = sqrt(8²+8²) ≈ 11.3 px — outside the 10 px radius
        const outsideRadius = result.current.isFreshTap({ x: 8, y: 8 });
        expect(outsideRadius).toBe(true);
      });
    });
  });

  // ── deduplicateTap — handler wrapping ──────────────────────────────────────

  describe('deduplicateTap — handler wrapping', () => {
    it('calls the handler for a fresh tap', () => {
      const handler = jest.fn();
      const { result } = renderHook(() => useTouchDeduplication());

      act(() => {
        result.current.deduplicateTap({ x: 20, y: 30 }, handler);
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('does NOT call the handler for a duplicate tap within 300 ms', () => {
      const handler = jest.fn();
      const { result } = renderHook(() => useTouchDeduplication());

      act(() => {
        result.current.deduplicateTap({ x: 20, y: 30 }, handler);
        jest.advanceTimersByTime(150);
        result.current.deduplicateTap({ x: 20, y: 30 }, handler);
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('calls the handler again after 300 ms window has passed', () => {
      const handler = jest.fn();
      const { result } = renderHook(() => useTouchDeduplication());

      act(() => {
        result.current.deduplicateTap({ x: 20, y: 30 }, handler);
        jest.advanceTimersByTime(300);
        result.current.deduplicateTap({ x: 20, y: 30 }, handler);
      });

      expect(handler).toHaveBeenCalledTimes(2);
    });
  });

  // ── Form submission double-submit prevention ────────────────────────────────

  describe('form submission — double-submit prevention', () => {
    it('prevents a form from being submitted twice on a single tap', () => {
      const submitForm = jest.fn();
      const { result } = renderHook(() => useTouchDeduplication());
      const tapCoords = { x: 160, y: 340 };

      act(() => {
        // Simulate platform firing the press handler twice in rapid succession
        result.current.deduplicateTap(tapCoords, submitForm);
        result.current.deduplicateTap(tapCoords, submitForm);
        result.current.deduplicateTap(tapCoords, submitForm);
      });

      expect(submitForm).toHaveBeenCalledTimes(1);
    });

    it('allows a second genuine submission after the window expires', () => {
      const submitForm = jest.fn();
      const { result } = renderHook(() => useTouchDeduplication());
      const tapCoords = { x: 160, y: 340 };

      act(() => {
        result.current.deduplicateTap(tapCoords, submitForm);
        jest.advanceTimersByTime(300);
        result.current.deduplicateTap(tapCoords, submitForm);
      });

      expect(submitForm).toHaveBeenCalledTimes(2);
    });
  });

  // ── reset ──────────────────────────────────────────────────────────────────

  describe('reset', () => {
    it('clears the last tap state so the next tap is always fresh', () => {
      const { result } = renderHook(() => useTouchDeduplication());

      act(() => {
        result.current.isFreshTap({ x: 50, y: 50 });
        jest.advanceTimersByTime(100);
        result.current.reset();
        const afterReset = result.current.isFreshTap({ x: 50, y: 50 });
        expect(afterReset).toBe(true);
      });
    });
  });

  // ── Custom options ─────────────────────────────────────────────────────────

  describe('custom options', () => {
    it('respects a custom windowMs override', () => {
      const { result } = renderHook(() => useTouchDeduplication({ windowMs: 500 }));

      act(() => {
        result.current.isFreshTap({ x: 0, y: 0 });
        jest.advanceTimersByTime(400);
        // Within custom 500 ms window → duplicate
        expect(result.current.isFreshTap({ x: 0, y: 0 })).toBe(false);
        jest.advanceTimersByTime(100);
        // Now 500 ms have passed → fresh
        expect(result.current.isFreshTap({ x: 0, y: 0 })).toBe(true);
      });
    });

    it('respects a custom radiusPx override', () => {
      const { result } = renderHook(() => useTouchDeduplication({ radiusPx: 20 }));

      act(() => {
        result.current.isFreshTap({ x: 0, y: 0 });
        jest.advanceTimersByTime(50);
        // distance ≈ 14.1 px — within default 10 px this would be fresh,
        // but within custom 20 px radius it is a duplicate
        expect(result.current.isFreshTap({ x: 10, y: 10 })).toBe(false);
      });
    });
  });
});
