import { useMemo } from 'react';

import { useDeviceUiComplexity } from './useDeviceUiComplexity';

export interface AdaptiveFrameRateConfig {
  /** Target frames-per-second for animations. */
  targetFPS: 30 | 60;

  /**
   * Multiply animation durations by this value.
   * 1 = normal (60 fps), 2 = half-speed (30 fps equivalent).
   */
  durationMultiplier: 1 | 2;

  /** Milliseconds per frame at the target FPS. */
  frameIntervalMs: number;

  /** True when the device hardware is below the low-end threshold. */
  isLowEndDevice: boolean;

  /** True when iOS Low Power Mode or Android Power Saver is active. */
  isBatterySaverEnabled: boolean;

  /** True when either condition requires reduced animation complexity. */
  shouldReduceAnimations: boolean;
}

/**
 * Backwards-compatible wrapper around useDeviceUiComplexity.
 * Maps the unified complexity classifier to the legacy 30|60 fps API.
 */
export function useAdaptiveFrameRate(): AdaptiveFrameRateConfig {
  const { shouldReduceAnimations, isLowEndDevice, isBatterySaverEnabled } = useDeviceUiComplexity();

  return useMemo(() => {
    const targetFPS: 30 | 60 = shouldReduceAnimations ? 30 : 60;
    const durationMultiplier: 1 | 2 = shouldReduceAnimations ? 2 : 1;

    return {
      targetFPS,
      durationMultiplier,
      frameIntervalMs: 1000 / targetFPS,
      isLowEndDevice,
      isBatterySaverEnabled,
      shouldReduceAnimations,
    };
  }, [shouldReduceAnimations, isLowEndDevice, isBatterySaverEnabled]);
}
