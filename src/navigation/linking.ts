import { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { NotificationData, NotificationType } from '../types/notifications';
import { RootStackParamList } from './types';
import logger from '../utils/logger';

const prefix = Linking.createURL('/');

/**
 * Deep linking configuration for React Navigation
 */
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [prefix, 'teachlink://', 'https://teachlink.com', 'https://www.teachlink.com'],

  config: {
    screens: {
      // Main tabs
      Home: '',
      Courses: 'courses',
      Messages: 'messages',
      Learning: 'learn',
      Community: 'community',
      Profile: 'profile',
      Achievements: 'achievements',

      // Detail screens with params
      CourseDetail: 'course/:courseId',
      Chat: 'messages/:conversationId',
      AchievementDetail: 'achievements/:achievementId',
      CommunityPost: 'community/:postId',

      // Settings
      Settings: 'settings',
      NotificationSettings: 'settings/notifications',
    },
  },

  /**
   * Custom function to get the initial URL
   * This handles app launch from notifications
   */
  async getInitialURL() {
    // Check if app was opened from a notification
    const response = await Notifications.getLastNotificationResponseAsync();

    if (response) {
      const data = response.notification.request.content.data as NotificationData | undefined;
      if (data) {
        return buildNotificationDeepLink(data);
      }
    }

    // Check for standard deep link
    const url = await Linking.getInitialURL();
    return url;
  },

  /**
   * Subscribe to incoming links
   */
  subscribe(listener) {
    // Listen for URL events from standard deep linking
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      listener(url);
    });

    // Listen for notification responses (user tapping notification)
    const notificationSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as NotificationData | undefined;
        if (data) {
          const url = buildNotificationDeepLink(data);
          if (url) {
            listener(url);
          }
        }
      }
    );

    return () => {
      linkingSubscription.remove();
      notificationSubscription.remove();
    };
  },
};

/**
 * Build a deep link URL from notification data
 */
function buildNotificationDeepLink(data: NotificationData): string | null {
  switch (data.type) {
    case NotificationType.COURSE_UPDATE:
      return data.courseId ? `teachlink://course/${data.courseId}` : 'teachlink://courses';

    case NotificationType.MESSAGE:
      return data.conversationId
        ? `teachlink://messages/${data.conversationId}`
        : 'teachlink://messages';

    case NotificationType.LEARNING_REMINDER:
      return 'teachlink://learn';

    case NotificationType.ACHIEVEMENT_UNLOCK:
      return data.achievementId
        ? `teachlink://achievements/${data.achievementId}`
        : 'teachlink://achievements';

    case NotificationType.COMMUNITY_ACTIVITY:
      return data.postId ? `teachlink://community/${data.postId}` : 'teachlink://community';

    default:
      return null;
  }
}

/**
 * Hook up notification listeners to navigation
 * Call this from your root component
 */
export function setupNotificationNavigation(): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    // Navigation is handled by the linking config above
    // This is here for any additional side effects
    logger.info('Notification response received:', response);
  });

  return () => {
    subscription.remove();
  };
}

export default linking;
