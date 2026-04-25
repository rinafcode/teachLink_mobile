import { useState, useEffect, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Linking } from 'react-native';
import logger from '../utils/logger';
import {
  registerForPushNotifications,
  registerTokenWithBackend,
} from '../services/pushNotifications';
import { useNotificationStore } from '../store/notificationStore';

export type PermissionStatus = 'undetermined' | 'granted' | 'denied';

interface UseNotificationPermissionReturn {
  permissionStatus: PermissionStatus;
  isLoading: boolean;
  isDevice: boolean;
  requestPermission: () => Promise<boolean>;
  openSettings: () => Promise<void>;
  checkPermission: () => Promise<PermissionStatus>;
}

export function useNotificationPermission(): UseNotificationPermissionReturn {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('undetermined');
  const [isLoading, setIsLoading] = useState(true);
  const { setPushToken, setTokenRegistered } = useNotificationStore();

  const isDevice = Device.isDevice;

  const checkPermission = useCallback(async (): Promise<PermissionStatus> => {
    if (!isDevice) {
      return 'denied';
    }

    try {
      const { status } = await Notifications.getPermissionsAsync();
      const mappedStatus = mapPermissionStatus(status);
      setPermissionStatus(mappedStatus);
      return mappedStatus;
    } catch (error) {
      logger.error('Error checking notification permission:', error);
      return 'undetermined';
    }
  }, [isDevice]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isDevice) {
      logger.warn('Push notifications require a physical device');
      return false;
    }

    setIsLoading(true);

    try {
      const token = await registerForPushNotifications();

      if (token) {
        setPushToken(token);

        // Register with backend
        const registered = await registerTokenWithBackend(token);
        setTokenRegistered(registered);

        setPermissionStatus('granted');
        setIsLoading(false);
        return true;
      }

      // Check what the actual status is after the request
      const { status } = await Notifications.getPermissionsAsync();
      setPermissionStatus(mapPermissionStatus(status));
      setIsLoading(false);
      return false;
    } catch (error) {
      logger.error('Error requesting notification permission:', error);
      setIsLoading(false);
      return false;
    }
  }, [isDevice, setPushToken, setTokenRegistered]);

  const openSettings = useCallback(async (): Promise<void> => {
    if (Platform.OS === 'ios') {
      await Linking.openURL('app-settings:');
    } else {
      await Linking.openSettings();
    }
  }, []);

  // Check permission status on mount
  useEffect(() => {
    const init = async () => {
      await checkPermission();
      setIsLoading(false);
    };

    init();
  }, [checkPermission]);

  // Listen for app state changes to detect when user returns from settings
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(() => {
      // Re-check permission when a notification is received
      checkPermission();
    });

    return () => {
      subscription.remove();
    };
  }, [checkPermission]);

  return {
    permissionStatus,
    isLoading,
    isDevice,
    requestPermission,
    openSettings,
    checkPermission,
  };
}

function mapPermissionStatus(
  status: Notifications.PermissionStatus
): PermissionStatus {
  switch (status) {
    case Notifications.PermissionStatus.GRANTED:
      return 'granted';
    case Notifications.PermissionStatus.DENIED:
      return 'denied';
    default:
      return 'undetermined';
  }
}
