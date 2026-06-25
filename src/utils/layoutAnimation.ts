import * as Device from 'expo-device';
import { Platform, LayoutAnimation as RNLayoutAnimation, UIManager } from 'react-native';

/**
 * Centralized LayoutAnimation utility with device capability detection
 * and performance optimizations for low-end devices.
 */

// ─────────────────────────────────────────────────────────────────────
// Device Capability Detection
// ─────────────────────────────────────────────────────────────────────

interface DeviceCapabilities {
  isLowEnd: boolean;
  totalMemory: number;
  deviceClass: 'low' | 'mid' | 'high';
  shouldReduceAnimations: boolean;
}

let cachedCapabilities: DeviceCapabilities | null = null;

/**
 * Detect device capabilities to determine animation strategy
 */
export function getDeviceCapabilities(): DeviceCapabilities {
  if (cachedCapabilities) {
    return cachedCapabilities;
  }

  const totalMemory = Device.totalMemory || 4 * 1024 * 1024 * 1024; // Default to 4GB
  const deviceYear = (Device as any).deviceYear ?? 2020;
  const isLowEnd = totalMemory < 3 * 1024 * 1024 * 1024 || deviceYear < 2020;

  let deviceClass: 'low' | 'mid' | 'high' = 'mid';
  if (isLowEnd) {
    deviceClass = 'low';
  } else if (totalMemory > 6 * 1024 * 1024 * 1024) {
    deviceClass = 'high';
  }

  cachedCapabilities = {
    isLowEnd,
    totalMemory,
    deviceClass,
    shouldReduceAnimations: deviceClass !== 'high',
  };

  return cachedCapabilities;
}

/**
 * Check if LayoutAnimation should be enabled for the current device
 */
export function shouldEnableLayoutAnimation(): boolean {
  const capabilities = getDeviceCapabilities();
  // Always enable on high/mid-end devices, disable on low-end
  return !capabilities.isLowEnd;
}

// ─────────────────────────────────────────────────────────────────────
// LayoutAnimation Configuration
// ─────────────────────────────────────────────────────────────────────

/**
 * Optimized animation configurations based on device capabilities
 */
export const LayoutAnimationPresets = {
  /**
   * Fast spring animation for high-performance devices
   */
  spring: RNLayoutAnimation.create(
    {
      duration: 250,
      create: { type: 'spring', property: 'opacity', springDamping: 0.7 },
      update: { type: 'spring', property: 'opacity', springDamping: 0.7 },
      delete: { type: 'spring', property: 'opacity', springDamping: 0.7 },
    },
    'spring'
  ),

  /**
   * Smooth ease-in-ease-out for mid-range devices
   */
  easeInEaseOut: RNLayoutAnimation.create(
    {
      duration: 300,
      create: { type: 'easeInEaseOut', property: 'opacity' },
      update: { type: 'easeInEaseOut', property: 'opacity' },
      delete: { type: 'easeInEaseOut', property: 'opacity' },
    },
    'easeInEaseOut'
  ),

  /**
   * Fast linear animation for low-end devices (minimal overhead)
   */
  fast: RNLayoutAnimation.create(
    {
      duration: 150,
      create: { type: 'linear', property: 'opacity' },
      update: { type: 'linear', property: 'opacity' },
      delete: { type: 'linear', property: 'opacity' },
    },
    'fast'
  ),

  /**
   * Minimal animation for very low-end devices (almost instant)
   */
  minimal: RNLayoutAnimation.create(
    {
      duration: 100,
      create: { type: 'linear', property: 'opacity' },
      update: { type: 'linear', property: 'opacity' },
      delete: { type: 'linear', property: 'opacity' },
    },
    'minimal'
  ),
};

/**
 * Get the appropriate animation preset based on device capabilities
 */
export function getOptimizedPreset(): RNLayoutAnimation.AnimationConfig {
  const capabilities = getDeviceCapabilities();

  switch (capabilities.deviceClass) {
    case 'low':
      return LayoutAnimationPresets.minimal;
    case 'mid':
      return LayoutAnimationPresets.easeInEaseOut;
    case 'high':
      return LayoutAnimationPresets.spring;
    default:
      return LayoutAnimationPresets.easeInEaseOut;
  }
}

// ─────────────────────────────────────────────────────────────────────
// Debouncing to Prevent Layout Thrashing
// ─────────────────────────────────────────────────────────────────────

let animationTimeout: NodeJS.Timeout | null = null;
const ANIMATION_DEBOUNCE_MS = 100;

/**
 * Debounced LayoutAnimation configuration to prevent layout thrashing
 * from rapid successive state updates
 */
export function configureNext(config?: RNLayoutAnimation.AnimationConfig): void {
  // Clear any pending animation
  if (animationTimeout) {
    clearTimeout(animationTimeout);
    animationTimeout = null;
  }

  if (!isLayoutAnimationSupported()) {
    return;
  }

  const capabilities = getDeviceCapabilities();
  if (capabilities.deviceClass === 'low') {
    return;
  }

  const animationConfig = config || getOptimizedPreset();

  animationTimeout = setTimeout(() => {
    try {
      RNLayoutAnimation.configureNext(animationConfig);
    } catch (error) {
      console.warn('[LayoutAnimation] Failed to configure next animation:', error);
    } finally {
      animationTimeout = null;
    }
  }, ANIMATION_DEBOUNCE_MS);
}

/**
 * Configure the next LayoutAnimation without debouncing.
 */
export function configureNextImmediate(config?: RNLayoutAnimation.AnimationConfig): void {
  if (!isLayoutAnimationSupported()) {
    return;
  }

  const capabilities = getDeviceCapabilities();
  if (capabilities.deviceClass === 'low') {
    return;
  }

  const animationConfig = config || getOptimizedPreset();

  try {
    RNLayoutAnimation.configureNext(animationConfig);
  } catch (error) {
    console.warn('[LayoutAnimation] Failed to configure immediate animation:', error);
  }
}

/**
 * Cancel any pending LayoutAnimation configuration
 */
export function cancelPendingAnimation(): void {
  if (animationTimeout) {
    clearTimeout(animationTimeout);
    animationTimeout = null;
  }
}

// ─────────────────────────────────────────────────────────────────────
// Native Platform Initialization
// ─────────────────────────────────────────────────────────────────────

let isInitialized = false;

/**
 * Initialize LayoutAnimation for Android (should be called once at app startup)
 * This is idempotent - safe to call multiple times
 */
export function initializeLayoutAnimation(): void {
  if (isInitialized) {
    return;
  }

  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    try {
      UIManager.setLayoutAnimationEnabledExperimental(true);
      isInitialized = true;
    } catch (error) {
      console.warn('[LayoutAnimation] Failed to enable experimental LayoutAnimation:', error);
    }
  } else if (Platform.OS === 'ios') {
    // iOS has LayoutAnimation enabled by default
    isInitialized = true;
  }
}

// ─────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────

/**
 * Check if LayoutAnimation is supported and enabled on the current platform
 */
export function isLayoutAnimationSupported(): boolean {
  if (Platform.OS === 'android') {
    return UIManager.setLayoutAnimationEnabledExperimental !== undefined;
  }
  return Platform.OS === 'ios';
}

/**
 * Get current device class for debugging/monitoring
 */
export function getDeviceClass(): string {
  return getDeviceCapabilities().deviceClass;
}

/**
 * Force re-evaluation of device capabilities (useful for testing)
 */
export function resetDeviceCapabilityCache(): void {
  cachedCapabilities = null;
}
