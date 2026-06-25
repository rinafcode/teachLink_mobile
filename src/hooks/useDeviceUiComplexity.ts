import { useLowPowerMode } from 'expo-battery';
import * as Device from 'expo-device';
import { useEffect, useMemo } from 'react';

import { mobileAnalyticsService } from '../services/mobileAnalytics';
import { useDeviceStore } from '../store/deviceStore';
import { AnalyticsEvent } from '../utils/trackingEvents';

export type UiComplexityLevel = 'low' | 'mid' | 'high';

export interface DeviceUiComplexityConfig {
  complexityLevel: UiComplexityLevel;
  /** True when iOS Low Power Mode or Android Power Saver is active. */
  isBatterySaverEnabled: boolean;
  /** True when device hardware is below the "low-end" threshold. */
  isLowEndDevice: boolean;
  shouldReduceAnimations: boolean;
  shouldDisableHeavyEffects: boolean;
  /** Target frames-per-second for animations. */
  animationTargetFPS: 30 | 45 | 60;
  /** Multiply animation durations by this value. 1 = normal, 2 = slower. */
  animationDurationMultiplier: 1 | 1.5 | 2;
  /** Milliseconds per frame at the chosen FPS. */
  frameIntervalMs: number;
  /** Raw classifier inputs for diagnostics & analytics. */
  deviceYearClass: number | null;
  totalMemoryBytes: number | null;
}

// Classification thresholds (documented in docs/UI_COMPLEXITY.md)
const LOW_END_YEAR_CLASS = 2018;
const LOW_END_MEMORY_BYTES = 2 * 1024 * 1024 * 1024; // <2 GB => low
const MID_END_MEMORY_BYTES = 4 * 1024 * 1024 * 1024; // 2–4 GB => mid, >=4 GB => high

function classifyDeviceLevel(params: {
  deviceYearClass: number | null;
  totalMemoryBytes: number | null;
  isBatterySaverEnabled: boolean;
}): Omit<
  DeviceUiComplexityConfig,
  'isBatterySaverEnabled' | 'frameIntervalMs' | 'deviceYearClass' | 'totalMemoryBytes'
> {
  const { deviceYearClass, totalMemoryBytes, isBatterySaverEnabled } = params;

  const isYearLow = deviceYearClass !== null && deviceYearClass < LOW_END_YEAR_CLASS;
  const isMemoryLow =
    totalMemoryBytes !== null && totalMemoryBytes > 0 && totalMemoryBytes < LOW_END_MEMORY_BYTES;
  const isLowEndDevice = Boolean(isYearLow || isMemoryLow);

  if (isBatterySaverEnabled || isLowEndDevice) {
    return {
      complexityLevel: 'low',
      isLowEndDevice,
      shouldReduceAnimations: true,
      shouldDisableHeavyEffects: true,
      animationTargetFPS: 30,
      animationDurationMultiplier: 2,
    };
  }

  const isMemoryMid =
    totalMemoryBytes !== null &&
    totalMemoryBytes >= LOW_END_MEMORY_BYTES &&
    totalMemoryBytes < MID_END_MEMORY_BYTES;

  if (isMemoryMid) {
    return {
      complexityLevel: 'mid',
      isLowEndDevice,
      shouldReduceAnimations: true,
      shouldDisableHeavyEffects: true,
      animationTargetFPS: 45,
      animationDurationMultiplier: 1.5,
    };
  }

  return {
    complexityLevel: 'high',
    isLowEndDevice,
    shouldReduceAnimations: false,
    shouldDisableHeavyEffects: false,
    animationTargetFPS: 60,
    animationDurationMultiplier: 1,
  };
}

/**
 * Detect device capability and adapt UI complexity: fewer animations on low-end,
 * richer UI on high-end devices.
 */
export function useDeviceUiComplexity(): DeviceUiComplexityConfig {
  const isBatterySaverEnabled = useLowPowerMode();
  const deviceYearClass = Device.deviceYearClass;
  const totalMemoryBytes = Device.totalMemory;
  const isInBackground = useDeviceStore(state => state.isInBackground);

  const config = useMemo(() => {
    const classified = classifyDeviceLevel({
      deviceYearClass,
      totalMemoryBytes,
      isBatterySaverEnabled,
    });

    // If the app is backgrounded, force the lowest complexity to effectively
    // pause animations and disable heavy visual effects while the app isn't visible.
    if (isInBackground) {
      return {
        complexityLevel: 'low',
        isLowEndDevice: classified.isLowEndDevice,
        shouldReduceAnimations: true,
        shouldDisableHeavyEffects: true,
        animationTargetFPS: 30,
        animationDurationMultiplier: 2,
        isBatterySaverEnabled,
        frameIntervalMs: 1000 / 30,
        deviceYearClass,
        totalMemoryBytes,
      } as DeviceUiComplexityConfig;
    }
    return {
      ...classified,
      isBatterySaverEnabled,
      frameIntervalMs: 1000 / classified.animationTargetFPS,
      deviceYearClass,
      totalMemoryBytes,
    };
  }, [deviceYearClass, totalMemoryBytes, isBatterySaverEnabled, isInBackground]);

  useEffect(() => {
    mobileAnalyticsService.trackEvent(AnalyticsEvent.DEVICE_COMPLEXITY_ASSIGNED, {
      complexity_level: config.complexityLevel,
      is_low_end_device: config.isLowEndDevice,
      is_battery_saver: config.isBatterySaverEnabled,
      animation_target_fps: config.animationTargetFPS,
      device_year_class: config.deviceYearClass ?? undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.complexityLevel]);

  return config;
}

export default useDeviceUiComplexity;
