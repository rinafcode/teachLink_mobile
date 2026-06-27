import Constants from 'expo-constants';
import { isDevice } from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { featureCapabilities, FeatureStatus, FeatureType } from './featureCapabilities';
import { useDegradationStore } from '../store/degradationStore';
import { NotificationData, NotificationType } from '../types/notifications';
import logger from '../utils/logger';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register for push notifications and get the Expo push token
 * Includes graceful degradation: if push notifications unavailable, falls back to in-app notifications
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Check device type using the proper 'isDevice' check from expo-device
  if (!isDevice) {
    logger.warn('Push notifications require a physical device (simulator detected)');
    featureCapabilities.getFeatureInfo(FeatureType.PUSH_NOTIFICATIONS);
    const degradationStore = useDegradationStore.getState(); // Fixed: Accessing Zustand store state cleanly outside a component
    degradationStore.setFeatureStatus(FeatureType.PUSH_NOTIFICATIONS, FeatureStatus.HARDWARE_UNAVAILABLE);
    degradationStore.addNotification({
      feature: FeatureType.PUSH_NOTIFICATIONS,
      status: FeatureStatus.HARDWARE_UNAVAILABLE,
      message: 'Push notifications are not available in the simulator. In-app notifications will be used instead.',
    });
    return null;
  }

  try {
    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      logger.warn('Push notification permission not granted');
      const degradationStore = useDegradationStore.getState();
      degradationStore.setFeatureStatus(FeatureType.PUSH_NOTIFICATIONS, FeatureStatus.PERMISSION_DENIED);
      degradationStore.addNotification({
        feature: FeatureType.PUSH_NOTIFICATIONS,
        status: FeatureStatus.PERMISSION_DENIED,
        message: 'Push notifications are disabled. In-app notifications will be shown instead. You can enable them in Settings.',
      });
      return null;
    }

    // Get the Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const token = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    // Set up Android notification channel
    if (Platform.OS === 'android') {
      try {
        await setupAndroidNotificationChannels();
      } catch (channelError) {
        logger.error('Error setting up Android notification channels:', channelError);
        // Continue anyway - channels are nice to have but not critical
      }
    }

    // Update feature capability on success
    featureCapabilities.getFeatureInfo(FeatureType.PUSH_NOTIFICATIONS);
    const degradationStore = useDegradationStore.getState();
    degradationStore.setFeatureStatus(FeatureType.PUSH_NOTIFICATIONS, FeatureStatus.AVAILABLE);

    return token.data;
  } catch (error) {
    logger.error('Error registering for push notifications:', error);
    const degradationStore = useDegradationStore.getState();
    degradationStore.setFeatureStatus(FeatureType.PUSH_NOTIFICATIONS, FeatureStatus.UNAVAILABLE);
    degradationStore.addNotification({
      feature: FeatureType.PUSH_NOTIFICATIONS,
      status: FeatureStatus.UNAVAILABLE,
      message: 'Push notifications failed to initialize. In-app notifications will be used instead.',
    });
    return null;
  }
}

/**
 * Set up Android notification channels for different notification types
 * Each channel setup is wrapped in try-catch to ensure one failure doesn't prevent others
 */
async function setupAndroidNotificationChannels(): Promise<void> {
  const channels = [
    {
      id: 'default',
      config: {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4F46E5',
      },
    },
    {
      id: 'course-updates',
      config: {
        name: 'Course Updates',
        description: 'Notifications about new course content and updates',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4F46E5',
      },
    },
    {
      id: 'messages',
      config: {
        name: 'Messages',
        description: 'New message notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
      },
    },
    {
      id: 'reminders',
      config: {
        name: 'Learning Reminders',
        description: 'Daily learning reminder notifications',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250],
        lightColor: '#F59E0B',
      },
    },
    {
      id: 'achievements',
      config: {
        name: 'Achievements',
        description: 'Achievement unlock notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#8B5CF6',
      },
    },
    {
      id: 'community',
      config: {
        name: 'Community Activity',
        description: 'Notifications about community posts and interactions',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250],
        lightColor: '#EC4899',
      },
    },
  ];

  // Set up each channel with graceful error handling
  for (const channel of channels) {
    try {
      await Notifications.setNotificationChannelAsync(channel.id, channel.config as any);
    } catch (error) {
      logger.warn(`Failed to set up notification channel '${channel.id}':`, error);
      // Continue setting up other channels if one fails
    }
  }
}

/**
 * Get the Android channel ID based on notification type
 */
export function getChannelId(type: NotificationType): string {
  switch (type) {
    case NotificationType.COURSE_UPDATE:
      return 'course-updates';
    case NotificationType.MESSAGE:
      return 'messages';
    case NotificationType.LEARNING_REMINDER:
      return 'reminders';
    case NotificationType.ACHIEVEMENT_UNLOCK:
      return 'achievements';
    case NotificationType.COMMUNITY_ACTIVITY:
      return 'community';
    default:
      return 'default';
  }
}

/**
 * Register push token with backend server
 * TODO: Implement actual API call when backend is ready
 */
export async function registerTokenWithBackend(token: string): Promise<boolean> {
  try {
    // TODO: Replace with actual API endpoint
    // const response = await apiClient.post('/api/notifications/register', {
    //   token,
    //   platform: Platform.OS,
    // });
    // return response.data.success;

    logger.info('Push token registered:', token);
    return true;
  } catch (error) {
    logger.error('Error registering token with backend:', error);
    return false;
  }
}

/**
 * Unregister push token from backend server
 * TODO: Implement actual API call when backend is ready
 */
export async function unregisterTokenFromBackend(token: string): Promise<boolean> {
  try {
    // TODO: Replace with actual API endpoint
    // const response = await apiClient.delete('/api/notifications/unregister', {
    //   data: { token },
    // });
    // return response.data.success;

    logger.info('Push token unregistered:', token);
    return true;
  } catch (error) {
    logger.error('Error unregistering token from backend:', error);
    return false;
  }
}

/**
 * Schedule a local notification (useful for testing and reminders).
 *
 * The `data` argument is validated and sanitised through
 * `validateNotificationPayload` before being embedded in the notification
 * content, preventing prototype-pollution vectors from reaching the
 * notification subsystem.
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data: NotificationData,
  trigger?: Notifications.NotificationTriggerInput
): Promise<string> {
  const safeData = validateNotificationPayload(data);
  if (!safeData) {
    throw new Error('scheduleLocalNotification: invalid or unsafe notification payload');
  }

  const channelId = getChannelId(safeData.type);

  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: safeData as unknown as Record<string, unknown>,
      sound: true,
      ...(Platform.OS === 'android' && { channelId }),
    },
    trigger: trigger || null, // null = immediate
  });
}

/**
 * Cancel a scheduled notification
 */
export async function cancelScheduledNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllScheduledNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get the current badge count
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set the badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear the badge count
 */
export async function clearBadgeCount(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}

/**
 * Add listener for notifications received while app is foregrounded
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add listener for when user interacts with a notification
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Remove a notification listener
 */
export function removeNotificationListener(subscription: Notifications.Subscription): void {
  subscription.remove(); 
}

/**
 * Get the last notification response (for handling app launch from notification)
 */
export async function getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
  return await Notifications.getLastNotificationResponseAsync();
}