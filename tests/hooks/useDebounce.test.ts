import { renderHook, act } from '@testing-library/react-native';
import { useDebounce, useDebounceCallback } from '../../src/hooks/useDebounce';

describe('useDebounce and useDebounceCallback hooks', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── useDebounce (value debouncing) ──────────────────────────────────────────

  describe('useDebounce', () => {
    it('returns the initial value immediately', () => {
      const { result } = renderHook(() => useDebounce('initial', 300));
      expect(result.current).toBe('initial');
    });

    it('updates the debounced value only after the delay has passed', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        { initialProps: { value: 'initial' } }
      );

      // Perform rapid typing simulation
      rerender({ value: 'typing...' });
      expect(result.current).toBe('initial'); // Not updated yet

      act(() => {
        jest.advanceTimersByTime(150);
      });
      expect(result.current).toBe('initial'); // Not updated yet

      act(() => {
        jest.advanceTimersByTime(150); // Completes 300ms total
      });
      expect(result.current).toBe('typing...'); // Updated now
    });

    it('resets the timer and debounces rapid successive changes', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        { initialProps: { value: 'init' } }
      );

      // simulate rapid keystrokes: 'a', 'ab', 'abc' (each separated by 100ms)
      rerender({ value: 'a' });
      act(() => { jest.advanceTimersByTime(100); });
      expect(result.current).toBe('init');

      rerender({ value: 'ab' });
      act(() => { jest.advanceTimersByTime(100); });
      expect(result.current).toBe('init');

      rerender({ value: 'abc' });
      act(() => { jest.advanceTimersByTime(100); });
      expect(result.current).toBe('init'); // 300ms since start, but only 100ms since last change

      // Wait 300ms after the LAST change
      act(() => { jest.advanceTimersByTime(200); }); // 300ms total for 'abc'
      expect(result.current).toBe('abc');
    });
  });

  // ── useDebounceCallback (callback debouncing) ──────────────────────────────

  describe('useDebounceCallback', () => {
    it('calls the callback function only after the delay has passed', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useDebounceCallback(callback, 100));

      result.current('scroll-event-1');
      expect(callback).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(50);
      });
      expect(callback).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(50); // Total 100ms
      });
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('scroll-event-1');
    });

    it('debounces rapid successive calls into a single invocation', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useDebounceCallback(callback, 100));

      // simulate rapid events (e.g. scrolling)
      result.current('x:10');
      result.current('x:20');
      result.current('x:30');

      expect(callback).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('x:30'); // Should receive the last parameters
    });

    it('calls callback immediately on cleanup if needed or cleans up timer on unmount', () => {
      const callback = jest.fn();
      const { result, unmount } = renderHook(() => useDebounceCallback(callback, 100));

      result.current('unmount-me');
      unmount();

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(callback).not.toHaveBeenCalled(); // Cleared and not called
    });
  });
});
