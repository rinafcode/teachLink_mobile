import { useMemo } from 'react';
import * as Device from 'expo-device';
import { useLowPowerMode } from 'expo-battery';
import { useSettingsStore } from '../store/settingsStore';
import { useDeviceStore } from '../store/deviceStore';

/** Devices made before this year are classified as low-end. */
const LOW_END_YEAR_CLASS = 2018;

/** Devices with less than 2 GB RAM are classified as low-end. */
const LOW_END_MEMORY_BYTES = 2 * 1024 * 1024 * 1024;

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
  /** True when the device battery is below 20%. */
  isLowBattery: boolean;
  /** True when data saver mode is enabled by user preference. */
  isDataSaverEnabled: boolean;
  /** True when either condition requires reduced animation complexity. */
  shouldReduceAnimations: boolean;
}

function detectLowEndDevice(): boolean {
  const yearClass = Device.deviceYearClass;
  if (yearClass !== null && yearClass < LOW_END_YEAR_CLASS) return true;

  const memory = Device.totalMemory;
  if (memory !== null && memory < LOW_END_MEMORY_BYTES) return true;

  return false;
}

/**
 * Returns animation configuration adapted to the current device capabilities
 * and power-saver state. Use `durationMultiplier` to scale timing values so
 * animations run at ~30 fps on low-end or battery-constrained devices.
 *
 * @example
 * const { durationMultiplier } = useAdaptiveFrameRate();
 * Animated.timing(value, { duration: 300 * durationMultiplier, ... })
 */
export function useAdaptiveFrameRate(): AdaptiveFrameRateConfig {
  const dataSaverEnabled = useSettingsStore(state => state.dataSaverEnabled);
  const isBatterySaverEnabled = useLowPowerMode();
  const isLowBattery = useDeviceStore(state => state.isLowBattery);
  const isLowEndDevice = useMemo(() => detectLowEndDevice(), []);

  return useMemo(() => {
    const shouldReduceAnimations = isLowEndDevice || isBatterySaverEnabled || isLowBattery || dataSaverEnabled;
    const targetFPS: 30 | 60 = shouldReduceAnimations ? 30 : 60;
    const durationMultiplier: 1 | 2 = shouldReduceAnimations ? 2 : 1;

    return {
      targetFPS,
      durationMultiplier,
      frameIntervalMs: 1000 / targetFPS,
      isLowEndDevice,
      isBatterySaverEnabled,
      isLowBattery,
      isDataSaverEnabled: dataSaverEnabled,
      shouldReduceAnimations,
    };
  }, [isLowEndDevice, isBatterySaverEnabled, isLowBattery, dataSaverEnabled]);
}
