/**
 * Feature Capability Detection Service
 *
 * Detects device/system capabilities and gracefully degrades features
 * when permissions are denied or hardware is unavailable.
 *
 * Supported Features:
 * - Camera (photo capture & gallery selection)
 * - Push Notifications (local device notifications)
 * - Location (user-provided location data)
 *
 * Usage:
 * const capabilities = FeatureCapabilities.getInstance();
 * if (capabilities.isFeatureAvailable('camera')) {
 *   // Use camera
 * } else {
 *   // Show fallback UI
 * }
 */

import * as Device from 'expo-device';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';

import { appLogger } from '../utils/logger';

export enum FeatureType {
  CAMERA = 'camera',
  PUSH_NOTIFICATIONS = 'pushNotifications',
  LOCATION = 'location',
}

export enum FeatureStatus {
  AVAILABLE = 'available',
  UNAVAILABLE = 'unavailable',
  PERMISSION_DENIED = 'permissionDenied',
  PERMISSION_NOT_REQUESTED = 'permissionNotRequested',
  HARDWARE_UNAVAILABLE = 'hardwareUnavailable',
  DEGRADED = 'degraded', // Partially available with limited functionality
}

export interface FeatureInfo {
  type: FeatureType;
  status: FeatureStatus;
  reason?: string; // Why the feature is unavailable
  fallbackAvailable: boolean; // Whether a fallback UX is available
  fallbackDescription?: string; // Description of fallback behavior
}

export interface FeatureCapabilities {
  camera: FeatureInfo;
  pushNotifications: FeatureInfo;
  location: FeatureInfo;
  checkedAt: string; // ISO timestamp of last check
}

class FeatureCan {
  private static instance: FeatureCan;
  private capabilities: FeatureCapabilities;
  private lastCheckTime: number = 0;
  private checkIntervalMs: number = 60000; // Recheck every 60 seconds

  private constructor() {
    this.capabilities = {
      camera: {
        type: FeatureType.CAMERA,
        status: FeatureStatus.UNAVAILABLE,
        fallbackAvailable: true,
        fallbackDescription: 'Users can select pre-existing images from their device',
      },
      pushNotifications: {
        type: FeatureType.PUSH_NOTIFICATIONS,
        status: FeatureStatus.UNAVAILABLE,
        fallbackAvailable: true,
        fallbackDescription: 'In-app notifications will be shown when the app is active',
      },
      location: {
        type: FeatureType.LOCATION,
        status: FeatureStatus.AVAILABLE, // Manual location entry always available
        fallbackAvailable: true,
        fallbackDescription: 'Users can manually enter their location as text',
      },
      checkedAt: new Date().toISOString(),
    };
  }

  public static getInstance(): FeatureCan {
    if (!FeatureCan.instance) {
      FeatureCan.instance = new FeatureCan();
    }
    return FeatureCan.instance;
  }

  /**
   * Check all feature capabilities
   * Respects rate limiting (only rechecks every 60 seconds)
   */
  public async checkAllCapabilities(): Promise<FeatureCapabilities> {
    const now = Date.now();
    if (now - this.lastCheckTime > this.checkIntervalMs) {
      await Promise.all([
        this.checkCameraCapability(),
        this.checkPushNotificationsCapability(),
        this.checkLocationCapability(),
      ]);
      this.lastCheckTime = now;
      this.capabilities.checkedAt = new Date().toISOString();
    }
    return this.capabilities;
  }

  /**
   * Check camera capability
   */
  private async checkCameraCapability(): Promise<void> {
    try {
      const cameraStatus = await ImagePicker.getCameraPermissionsAsync();
      const mediaLibraryStatus = await ImagePicker.getMediaLibraryPermissionsAsync();

      if (cameraStatus.granted && mediaLibraryStatus.granted) {
        this.capabilities.camera = {
          type: FeatureType.CAMERA,
          status: FeatureStatus.AVAILABLE,
          fallbackAvailable: true,
          fallbackDescription: 'Users can select from their photo library',
        };
      } else if (cameraStatus.status === 'denied' || mediaLibraryStatus.status === 'denied') {
        this.capabilities.camera = {
          type: FeatureType.CAMERA,
          status: FeatureStatus.PERMISSION_DENIED,
          reason: 'Camera or media library permission denied by user',
          fallbackAvailable: true,
          fallbackDescription: 'Users can select from their existing photo library if available',
        };
      } else {
        this.capabilities.camera = {
          type: FeatureType.CAMERA,
          status: FeatureStatus.PERMISSION_NOT_REQUESTED,
          reason: 'Camera permission not yet requested',
          fallbackAvailable: true,
          fallbackDescription: 'Users can request permission or use photo library',
        };
      }
    } catch (error) {
      this.capabilities.camera = {
        type: FeatureType.CAMERA,
        status: FeatureStatus.UNAVAILABLE,
        reason: `Camera check failed: ${error instanceof Error ? error.message : String(error)}`,
        fallbackAvailable: true,
        fallbackDescription: 'Users can select from their photo library',
      };
      appLogger.errorSync('[FeatureCapabilities] Camera check failed', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Check push notifications capability
   */
  private async checkPushNotificationsCapability(): Promise<void> {
    try {
      // Push notifications require a physical device
      if (!Device.isDevice) {
        this.capabilities.pushNotifications = {
          type: FeatureType.PUSH_NOTIFICATIONS,
          status: FeatureStatus.HARDWARE_UNAVAILABLE,
          reason: 'Push notifications only work on physical devices, not simulators',
          fallbackAvailable: true,
          fallbackDescription: 'In-app notifications will be shown instead when the app is active',
        };
        return;
      }

      const { status } = await Notifications.getPermissionsAsync();

      if (status === 'granted') {
        this.capabilities.pushNotifications = {
          type: FeatureType.PUSH_NOTIFICATIONS,
          status: FeatureStatus.AVAILABLE,
          fallbackAvailable: true,
          fallbackDescription: 'In-app notifications available as backup',
        };
      } else if (status === 'denied') {
        this.capabilities.pushNotifications = {
          type: FeatureType.PUSH_NOTIFICATIONS,
          status: FeatureStatus.PERMISSION_DENIED,
          reason: 'User denied notification permission',
          fallbackAvailable: true,
          fallbackDescription: 'In-app notifications will be shown when the app is active',
        };
      } else {
        this.capabilities.pushNotifications = {
          type: FeatureType.PUSH_NOTIFICATIONS,
          status: FeatureStatus.PERMISSION_NOT_REQUESTED,
          reason: 'Notification permission not yet requested',
          fallbackAvailable: true,
          fallbackDescription: 'In-app notifications available or request permission',
        };
      }
    } catch (error) {
      this.capabilities.pushNotifications = {
        type: FeatureType.PUSH_NOTIFICATIONS,
        status: FeatureStatus.UNAVAILABLE,
        reason: `Push notification check failed: ${error instanceof Error ? error.message : String(error)}`,
        fallbackAvailable: true,
        fallbackDescription: 'In-app notifications will be shown instead when the app is active',
      };
      appLogger.errorSync('[FeatureCapabilities] Push notification check failed', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Check location capability
   * Note: Location is always available via manual text entry
   */
  private async checkLocationCapability(): Promise<void> {
    // Location is always available via manual user input
    // Could be extended to check device.hasGPS or geo-location API permissions
    this.capabilities.location = {
      type: FeatureType.LOCATION,
      status: FeatureStatus.AVAILABLE,
      reason: 'Manual location entry always available',
      fallbackAvailable: true,
      fallbackDescription: 'Users can manually enter their location as text',
    };
  }

  /**
   * Check if a specific feature is available
   */
  public isFeatureAvailable(feature: FeatureType): boolean {
    const featureInfo = this.getFeatureInfo(feature);
    return featureInfo.status === FeatureStatus.AVAILABLE || featureInfo.status === FeatureStatus.DEGRADED;
  }

  /**
   * Get detailed info about a feature
   */
  public getFeatureInfo(feature: FeatureType): FeatureInfo {
    switch (feature) {
      case FeatureType.CAMERA:
        return this.capabilities.camera;
      case FeatureType.PUSH_NOTIFICATIONS:
        return this.capabilities.pushNotifications;
      case FeatureType.LOCATION:
        return this.capabilities.location;
      default:
        throw new Error(`Unknown feature: ${feature}`);
    }
  }

  /**
   * Get all capabilities
   */
  public getCapabilities(): FeatureCapabilities {
    return { ...this.capabilities };
  }

  /**
   * Force recheck of capabilities (ignoring rate limit)
   */
  public async forceRecheck(): Promise<FeatureCapabilities> {
    this.lastCheckTime = 0;
    return this.checkAllCapabilities();
  }

  /**
   * Get a human-friendly message about why a feature is unavailable
   */
  public getUnavailabilityMessage(feature: FeatureType): string {
    const info = this.getFeatureInfo(feature);

    switch (info.status) {
      case FeatureStatus.AVAILABLE:
        return 'Feature is available';
      case FeatureStatus.HARDWARE_UNAVAILABLE:
        return info.reason || 'Feature is not available on this device';
      case FeatureStatus.PERMISSION_DENIED:
        return `Permission denied. ${info.fallbackDescription || 'A fallback is available.'}`;
      case FeatureStatus.PERMISSION_NOT_REQUESTED:
        return 'Permission not yet requested. Would you like to grant access?';
      case FeatureStatus.UNAVAILABLE:
      case FeatureStatus.DEGRADED:
      default:
        return info.reason || 'Feature is temporarily unavailable';
    }
  }
}

export const featureCapabilities = FeatureCan.getInstance();
