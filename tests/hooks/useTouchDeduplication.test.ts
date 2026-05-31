import { renderHook, act } from '@testing-library/react-native';

import {
  useTouchDeduplication,
  withTouchDeduplication,
} from '../../src/hooks/useTouchDeduplication';

import type { GestureResponderEvent } from 'react-native';

describe('useTouchDeduplication and withTouchDeduplication', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── useTouchDeduplication (hook) ────────────────────────────────────────────

  describe('useTouchDeduplication', () => {
    it('calls the handler on first tap', () => {
      const mockHandler = jest.fn();
      const { result } = renderHook(() => useTouchDeduplication(mockHandler));

      act(() => {
        result.current.dedupledHandler({
          nativeEvent: { pageX: 100, pageY: 100 },
        } as GestureResponderEvent);
      });

      expect(mockHandler).toHaveBeenCalledTimes(1);
    });

    it('ignores duplicate taps within threshold at same location', () => {
      const mockHandler = jest.fn();
      const { result } = renderHook(() => useTouchDeduplication(mockHandler, { threshold: 300 }));

      // First tap
      act(() => {
        result.current.dedupledHandler({
          nativeEvent: { pageX: 100, pageY: 100 },
        } as GestureResponderEvent);
      });

      expect(mockHandler).toHaveBeenCalledTimes(1);

      // Duplicate tap within 300ms at same location
      act(() => {
        jest.advanceTimersByTime(150);
        result.current.dedupledHandler({
          nativeEvent: { pageX: 100, pageY: 100 },
        } as GestureResponderEvent);
      });

      expect(mockHandler).toHaveBeenCalledTimes(1); // Still 1, duplicate ignored
    });

    it('allows new tap after threshold expires', () => {
      const mockHandler = jest.fn();
      const { result } = renderHook(() => useTouchDeduplication(mockHandler, { threshold: 300 }));

      // First tap
      act(() => {
        result.current.dedupledHandler({
          nativeEvent: { pageX: 100, pageY: 100 },
        } as GestureResponderEvent);
      });

      expect(mockHandler).toHaveBeenCalledTimes(1);

      // Wait for threshold to expire
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // New tap after threshold
      act(() => {
        result.current.dedupledHandler({
          nativeEvent: { pageX: 100, pageY: 100 },
        } as GestureResponderEvent);
      });

      expect(mockHandler).toHaveBeenCalledTimes(2);
    });

    it('allows tap at different location within threshold', () => {
      const mockHandler = jest.fn();
      const { result } = renderHook(() =>
        useTouchDeduplication(mockHandler, {
          threshold: 300,
          coordinateTolerance: 10,
        })
      );

      // First tap
      act(() => {
        result.current.dedupledHandler({
          nativeEvent: { pageX: 100, pageY: 100 },
        } as GestureResponderEvent);
      });

      expect(mockHandler).toHaveBeenCalledTimes(1);

      // Tap at different location (outside tolerance)
      act(() => {
        jest.advanceTimersByTime(150);
        result.current.dedupledHandler({
          nativeEvent: { pageX: 150, pageY: 100 }, // 50px away from first tap
        } as GestureResponderEvent);
      });

      expect(mockHandler).toHaveBeenCalledTimes(2);
    });

    it('respects coordinate tolerance', () => {
      const mockHandler = jest.fn();
      const { result } = renderHook(() =>
        useTouchDeduplication(mockHandler, {
          threshold: 300,
          coordinateTolerance: 10,
        })
      );

      // First tap
      act(() => {
        result.current.dedupledHandler({
          nativeEvent: { pageX: 100, pageY: 100 },
        } as GestureResponderEvent);
      });

      expect(mockHandler).toHaveBeenCalledTimes(1);

      // Tap within tolerance (5px away)
      act(() => {
        jest.advanceTimersByTime(150);
        result.current.dedupledHandler({
          nativeEvent: { pageX: 105, pageY: 105 },
        } as GestureResponderEvent);
      });

      expect(mockHandler).toHaveBeenCalledTimes(1); // Still 1, within tolerance
    });

    it('calls onDuplicate callback when duplicate detected', () => {
      const mockHandler = jest.fn();
      const onDuplicate = jest.fn();
      const { result } = renderHook(() =>
        useTouchDeduplication(mockHandler, {
          threshold: 300,
          onDuplicate,
        })
      );

      // First tap
      act(() => {
        result.current.dedupledHandler({
          nativeEvent: { pageX: 100, pageY: 100 },
        } as GestureResponderEvent);
      });

      expect(onDuplicate).not.toHaveBeenCalled();

      // Duplicate tap
      act(() => {
        jest.advanceTimersByTime(150);
        result.current.dedupledHandler({
          nativeEvent: { pageX: 100, pageY: 100 },
        } as GestureResponderEvent);
      });

      expect(onDuplicate).toHaveBeenCalledTimes(1);
    });

    it('handles async handlers correctly', () => {
      const mockAsyncHandler = jest.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useTouchDeduplication(mockAsyncHandler, { threshold: 300 })
      );

      // First tap
      act(() => {
        result.current.dedupledHandler({
          nativeEvent: { pageX: 100, pageY: 100 },
        } as GestureResponderEvent);
      });

      expect(mockAsyncHandler).toHaveBeenCalledTimes(1);

      // Try to call again while async handler is running
      act(() => {
        jest.advanceTimersByTime(50);
        result.current.dedupledHandler({
          nativeEvent: { pageX: 100, pageY: 100 },
        } as GestureResponderEvent);
      });

      // Should be prevented from calling again
      expect(mockAsyncHandler).toHaveBeenCalledTimes(1);
    });

    it('handles missing event gracefully', () => {
      const mockHandler = jest.fn();
      const { result } = renderHook(() => useTouchDeduplication(mockHandler, { threshold: 300 }));

      // Call with no event
      act(() => {
        result.current.dedupledHandler();
      });

      expect(mockHandler).toHaveBeenCalledTimes(1);

      // Duplicate call with no event
      act(() => {
        jest.advanceTimersByTime(150);
        result.current.dedupledHandler();
      });

      expect(mockHandler).toHaveBeenCalledTimes(1); // Ignored as duplicate
    });
  });

  // ── withTouchDeduplication (non-hook wrapper) ───────────────────────────────

  describe('withTouchDeduplication', () => {
    it('calls the handler on first tap', () => {
      const mockHandler = jest.fn();
      const dedupledHandler = withTouchDeduplication(mockHandler);

      act(() => {
        dedupledHandler({
          nativeEvent: { pageX: 100, pageY: 100 },
        } as GestureResponderEvent);
      });

      expect(mockHandler).toHaveBeenCalledTimes(1);
    });

    it('ignores duplicate taps within threshold', () => {
      const mockHandler = jest.fn();
      const dedupledHandler = withTouchDeduplication(mockHandler, { threshold: 300 });

      // First tap
      act(() => {
        dedupledHandler({
          nativeEvent: { pageX: 100, pageY: 100 },
        } as GestureResponderEvent);
      });

      expect(mockHandler).toHaveBeenCalledTimes(1);

      // Duplicate tap within 300ms
      act(() => {
        jest.advanceTimersByTime(150);
        dedupledHandler({
          nativeEvent: { pageX: 100, pageY: 100 },
        } as GestureResponderEvent);
      });

      expect(mockHandler).toHaveBeenCalledTimes(1);
    });

    it('calls onDuplicate callback when duplicate detected', () => {
      const mockHandler = jest.fn();
      const onDuplicate = jest.fn();
      const dedupledHandler = withTouchDeduplication(mockHandler, {
        threshold: 300,
        onDuplicate,
      });

      // First tap
      act(() => {
        dedupledHandler({
          nativeEvent: { pageX: 100, pageY: 100 },
        } as GestureResponderEvent);
      });

      expect(onDuplicate).not.toHaveBeenCalled();

      // Duplicate tap
      act(() => {
        jest.advanceTimersByTime(150);
        dedupledHandler({
          nativeEvent: { pageX: 100, pageY: 100 },
        } as GestureResponderEvent);
      });

      expect(onDuplicate).toHaveBeenCalledTimes(1);
    });

    it('maintains separate state for different instances', () => {
      const mockHandler1 = jest.fn();
      const mockHandler2 = jest.fn();

      const dedupledHandler1 = withTouchDeduplication(mockHandler1, { threshold: 300 });
      const dedupledHandler2 = withTouchDeduplication(mockHandler2, { threshold: 300 });

      // First handler - first tap
      act(() => {
        dedupledHandler1({
          nativeEvent: { pageX: 100, pageY: 100 },
        } as GestureResponderEvent);
      });

      // Second handler - first tap
      act(() => {
        dedupledHandler2({
          nativeEvent: { pageX: 100, pageY: 100 },
        } as GestureResponderEvent);
      });

      expect(mockHandler1).toHaveBeenCalledTimes(1);
      expect(mockHandler2).toHaveBeenCalledTimes(1);

      // Both receive duplicate taps
      act(() => {
        jest.advanceTimersByTime(150);
        dedupledHandler1({
          nativeEvent: { pageX: 100, pageY: 100 },
        } as GestureResponderEvent);
        dedupledHandler2({
          nativeEvent: { pageX: 100, pageY: 100 },
        } as GestureResponderEvent);
      });

      expect(mockHandler1).toHaveBeenCalledTimes(1); // Duplicate ignored
      expect(mockHandler2).toHaveBeenCalledTimes(1); // Duplicate ignored
    });
  });

  // ── Form Submission Integration ─────────────────────────────────────────

  describe('Form submission double-prevention', () => {
    it('prevents form double-submission', () => {
      const mockSubmit = jest.fn().mockResolvedValue({ success: true });
      const { result } = renderHook(() => useTouchDeduplication(mockSubmit, { threshold: 300 }));

      // Simulate rapid taps on submit button
      act(() => {
        result.current.dedupledHandler({
          nativeEvent: { pageX: 150, pageY: 200 },
        } as GestureResponderEvent);
        result.current.dedupledHandler({
          nativeEvent: { pageX: 150, pageY: 200 },
        } as GestureResponderEvent);
      });

      expect(mockSubmit).toHaveBeenCalledTimes(1); // Only called once
    });

    it('prevents concurrent form submissions', () => {
      jest.useRealTimers(); // Use real timers for this async test
      const mockSubmit = jest.fn(() => Promise.resolve({ success: true }));

      const { result } = renderHook(() => useTouchDeduplication(mockSubmit));

      // First submission
      result.current.dedupledHandler({
        nativeEvent: { pageX: 150, pageY: 200 },
      } as GestureResponderEvent);

      expect(mockSubmit).toHaveBeenCalledTimes(1);

      // Try to submit again immediately (still locked by async handler)
      result.current.dedupledHandler({
        nativeEvent: { pageX: 100, pageY: 100 }, // Different location, but still locked
      } as GestureResponderEvent);

      // Should still be locked
      expect(mockSubmit).toHaveBeenCalledTimes(1);

      jest.useFakeTimers(); // Resume fake timers
    });
  });
});
