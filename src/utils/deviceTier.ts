import * as Device from 'expo-device';
import { Platform } from 'react-native';

/**
 * Device tier detection for performance-based animation decisions
 *
 * This module provides device capability detection to determine
 * whether to enable, reduce, or disable animations based on hardware.
 */

let cachedDeviceTier: DeviceTier | null = null;

export type DeviceTier = 'low' | 'mid' | 'high';

/**
 * Device capability information
 */
interface DeviceCapabilities {
  tier: DeviceTier;
  totalMemoryMB: number;
  deviceYear: number;
  isLowEnd: boolean;
  shouldReduceAnimations: boolean;
}

/**
 * Get device tier based on hardware capabilities
 *
 * Low-end criteria:
 * - Total memory < 2GB
 * - Device manufactured before 2020
 * - Android API level < 26 (Android 8.0)
 *
 * High-end criteria:
 * - Total memory >= 6GB
 * - Device manufactured 2022 or later
 */
export function getDeviceTier(): DeviceTier {
  if (cachedDeviceTier) {
    return cachedDeviceTier;
  }

  const totalMemory = Device.totalMemory || 4 * 1024 * 1024 * 1024; // Default to 4GB
  const totalMemoryMB = totalMemory / (1024 * 1024);
  const deviceYear = (Device as any).deviceYear ?? 2020;
  const platformVersion = Platform.Version as number;

  // Android API level check
  const isOldAndroid = Platform.OS === 'android' && platformVersion < 26;

  // Determine tier
  let tier: DeviceTier = 'mid';

  if (totalMemoryMB < 2048 || deviceYear < 2020 || isOldAndroid) {
    tier = 'low';
  } else if (totalMemoryMB >= 6144 && deviceYear >= 2022) {
    tier = 'high';
  }

  cachedDeviceTier = tier;
  return tier;
}

/**
 * Check if the device is low-end and should have animations disabled
 */
export function isLowEndDevice(): boolean {
  return getDeviceTier() === 'low';
}

/**
 * Check if animations should be reduced for this device
 * (mid-tier devices may get reduced animations, low-tier gets none)
 */
export function shouldReduceAnimations(): boolean {
  const tier = getDeviceTier();
  return tier === 'low' || tier === 'mid';
}

/**
 * Get comprehensive device capabilities
 */
export function getDeviceCapabilities(): DeviceCapabilities {
  const tier = getDeviceTier();
  const totalMemory = Device.totalMemory || 4 * 1024 * 1024 * 1024;
  const totalMemoryMB = totalMemory / (1024 * 1024);
  const deviceYear = (Device as any).deviceYear ?? 2020;

  return {
    tier,
    totalMemoryMB,
    deviceYear,
    isLowEnd: tier === 'low',
    shouldReduceAnimations: tier !== 'high',
  };
}

/**
 * Reset cached device tier (useful for testing)
 */
export function resetDeviceTierCache(): void {
  cachedDeviceTier = null;
}
