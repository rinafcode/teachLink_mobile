import { Platform } from 'react-native';

/**
 * Animation Scheduler Utility
 * 
 * Provides requestAnimationFrame-based timing for smooth, frame-synced animations.
 * This ensures animations run at 60fps and avoid jank caused by setTimeout/setInterval.
 * 
 * @example
 * ```ts
 * const scheduler = new AnimationScheduler();
 * scheduler.schedule(() => {
 *   // Your animation frame logic
 * }, 1000); // Run for 1 second
 * ```
 */

export class AnimationScheduler {
  private rafId: number | null = null;
  private startTime: number | null = null;
  private callback: ((timestamp: number) => boolean) | null = null;
  private duration: number | null = null;

  /**
   * Schedule an animation callback using requestAnimationFrame
   * @param callback Function to call each frame. Return true to continue, false to stop.
   * @param duration Optional duration in milliseconds. If provided, animation stops after this time.
   */
  schedule(callback: (timestamp: number) => boolean, duration?: number): void {
    this.cancel();
    this.callback = callback;
    this.duration = duration ?? null;
    this.startTime = null;
    this.rafId = this.requestAnimationFrame(this.tick);
  }

  private tick = (timestamp: number): void => {
    if (this.startTime === null) {
      this.startTime = timestamp;
    }

    const elapsed = timestamp - this.startTime;
    const shouldContinue = this.callback?.(elapsed) ?? false;

    // Check if duration exceeded
    if (this.duration !== null && elapsed >= this.duration) {
      this.cancel();
      return;
    }

    if (shouldContinue) {
      this.rafId = this.requestAnimationFrame(this.tick);
    } else {
      this.cancel();
    }
  };

  /**
   * Cancel the current animation
   */
  cancel(): void {
    if (this.rafId !== null) {
      this.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.callback = null;
    this.startTime = null;
    this.duration = null;
  }

  /**
   * Platform-specific requestAnimationFrame
   */
  private requestAnimationFrame(callback: FrameRequestCallback): number {
    if (Platform.OS === 'web') {
      return (window as any).requestAnimationFrame(callback);
    }
    return (global as any).requestAnimationFrame(callback);
  }

  /**
   * Platform-specific cancelAnimationFrame
   */
  private cancelAnimationFrame(id: number): void {
    if (Platform.OS === 'web') {
      (window as any).cancelAnimationFrame(id);
    } else {
      (global as any).cancelAnimationFrame(id);
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.cancel();
  }
}


/**
 * Schedule a one-time callback using requestAnimationFrame
 * This is the rAF equivalent of setTimeout
 * 
 * @param callback Function to call on next animation frame
 * @param delay Optional delay in milliseconds (not frame-synced, uses setTimeout for delay then rAF for execution)
 */
export function scheduleAnimationFrame(
  callback: () => void,
  delay?: number
): () => void {
  if (delay === undefined || delay === 0) {
    const rafId = requestAnimationFrame(() => {
      callback();
    });
    return () => cancelAnimationFrame(rafId);
  }

  // For delayed execution, use setTimeout for the delay, then rAF for frame sync
  const timeoutId = setTimeout(() => {
    const rafId = requestAnimationFrame(callback);
    // Store rafId for cleanup if needed
    (timeoutId as any).rafId = rafId;
  }, delay);

  return () => {
    clearTimeout(timeoutId);
    if ((timeoutId as any).rafId) {
      cancelAnimationFrame((timeoutId as any).rafId);
    }
  };
}

/**
 * Schedule a recurring callback using requestAnimationFrame
 * This is the rAF equivalent of setInterval for animations
 * 
 * @param callback Function to call each frame. Return false to stop.
 * @param duration Optional duration in milliseconds
 */
export function scheduleRecurringAnimationFrame(
  callback: (timestamp: number) => boolean,
  duration?: number
): AnimationScheduler {
  const scheduler = new AnimationScheduler();
  scheduler.schedule(callback, duration);
  return scheduler;
}

/**
 * Debounce function using requestAnimationFrame
 * Ensures the callback runs on the next animation frame, not immediately
 * 
 * @param callback Function to debounce
 * @param delay Optional delay in milliseconds
 */
export function debounceAnimationFrame<T extends (...args: any[]) => any>(
  callback: T,
  delay?: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let rafId: number | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    const execute = () => {
      rafId = requestAnimationFrame(() => {
        callback(...args);
        rafId = null;
      });
    };

    if (delay === undefined || delay === 0) {
      execute();
    } else {
      timeoutId = setTimeout(execute, delay);
    }
  };
}

/**
 * Throttle function using requestAnimationFrame
 * Ensures the callback runs at most once per animation frame
 * 
 * @param callback Function to throttle
 */
export function throttleAnimationFrame<T extends (...args: any[]) => any>(
  callback: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;
  let lastArgs: Parameters<T> | null = null;

  return (...args: Parameters<T>) => {
    lastArgs = args;
    
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        if (lastArgs !== null) {
          callback(...lastArgs);
          lastArgs = null;
        }
        rafId = null;
      });
    }
  };
}
