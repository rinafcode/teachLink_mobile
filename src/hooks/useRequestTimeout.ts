import { useState, useEffect, useRef, useCallback } from 'react';

/** Axios default timeout in ms — keep in sync with axios.config.ts */
export const REQUEST_TIMEOUT_MS = 10_000;

const TICK_MS = 100;

export interface UseRequestTimeoutReturn {
  /** 0–1 progress through the timeout window */
  progress: number;
  /** Remaining milliseconds */
  remaining: number;
  /** True once the countdown reaches zero */
  isTimedOut: boolean;
  /** Start (or restart) the countdown */
  start: () => void;
  /** Stop and reset the countdown */
  reset: () => void;
}

/**
 * Tracks a request timeout countdown.
 *
 * @param timeoutMs  Total timeout duration (default: REQUEST_TIMEOUT_MS)
 * @param onTimeout  Optional callback fired when the countdown reaches zero
 */
export function useRequestTimeout(
  timeoutMs: number = REQUEST_TIMEOUT_MS,
  onTimeout?: () => void,
): UseRequestTimeoutReturn {
  const [elapsed, setElapsed] = useState(0);
  const [active, setActive] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const clear = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const start = useCallback(() => {
    clear();
    setElapsed(0);
    setActive(true);
    intervalRef.current = setInterval(() => {
      setElapsed((prev) => prev + TICK_MS);
    }, TICK_MS);
  }, []);

  const reset = useCallback(() => {
    clear();
    setElapsed(0);
    setActive(false);
  }, []);

  // Stop ticking and fire callback when timeout is reached
  useEffect(() => {
    if (active && elapsed >= timeoutMs) {
      clear();
      setActive(false);
      onTimeoutRef.current?.();
    }
  }, [active, elapsed, timeoutMs]);

  // Cleanup on unmount
  useEffect(() => () => clear(), []);

  const remaining = Math.max(0, timeoutMs - elapsed);
  const progress = Math.min(1, elapsed / timeoutMs);
  const isTimedOut = elapsed >= timeoutMs;

  return { progress, remaining, isTimedOut, start, reset };
}
