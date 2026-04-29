import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NotificationData, NotificationType } from '../types/notifications';
import logger from '../utils/logger';
import apiClient from './api/axios.config';

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
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    logger.warn('Push notifications require a physical device');
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
      return null;
    }

    // Get the Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const token = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    // Set up Android notification channel
    if (Platform.OS === 'android') {
      await setupAndroidNotificationChannels();
    }

    return token.data;
  } catch (error) {
    logger.error('Error registering for push notifications:', error);
    return null;
  }
}

/**
 * Set up Android notification channels for different notification types
 */
async function setupAndroidNotificationChannels(): Promise<void> {
  // Default channel for general notifications
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#4F46E5',
  });

  // Course updates channel
  await Notifications.setNotificationChannelAsync('course-updates', {
    name: 'Course Updates',
    description: 'Notifications about new course content and updates',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#4F46E5',
  });

  // Messages channel
  await Notifications.setNotificationChannelAsync('messages', {
    name: 'Messages',
    description: 'New message notifications',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#10B981',
  });

  // Learning reminders channel
  await Notifications.setNotificationChannelAsync('reminders', {
    name: 'Learning Reminders',
    description: 'Daily learning reminder notifications',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250],
    lightColor: '#F59E0B',
  });

  // Achievements channel
  await Notifications.setNotificationChannelAsync('achievements', {
    name: 'Achievements',
    description: 'Achievement unlock notifications',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 500, 250, 500],
    lightColor: '#8B5CF6',
  });

  // Community channel
  await Notifications.setNotificationChannelAsync('community', {
    name: 'Community Activity',
    description: 'Notifications about community posts and interactions',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250],
    lightColor: '#EC4899',
  });
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
    //   deviceId: Device.deviceName,
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
 * Schedule a local notification (useful for testing and reminders)
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data: NotificationData,
  trigger?: Notifications.NotificationTriggerInput
): Promise<string> {
  const channelId = getChannelId(data.type);

  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data as unknown as Record<string, unknown>,
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
  Notifications.removeNotificationSubscription(subscription);
}

/**
 * Get the last notification response (for handling app launch from notification)
 */
export async function getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
  return await Notifications.getLastNotificationResponseAsync();
}
