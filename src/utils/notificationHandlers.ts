import * as Notifications from 'expo-notifications';
import { useNotificationStore } from '../store/notificationStore';
import { NotificationData, NotificationType } from '../types/notifications';
import logger from './logger';

type NavigationRef = {
  navigate: (screen: string, params?: Record<string, unknown>) => void;
  isReady: () => boolean;
};

let navigationRef: NavigationRef | null = null;

function isNotificationType(value: unknown): value is NotificationType {
  return typeof value === 'string' && Object.values(NotificationType).includes(value as NotificationType);
}

function toNotificationData(value: unknown): NotificationData | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const maybeData = value as Record<string, unknown>;
  if (!isNotificationType(maybeData.type)) return undefined;

  return {
    type: maybeData.type,
    courseId: typeof maybeData.courseId === 'string' ? maybeData.courseId : undefined,
    conversationId:
      typeof maybeData.conversationId === 'string' ? maybeData.conversationId : undefined,
    achievementId: typeof maybeData.achievementId === 'string' ? maybeData.achievementId : undefined,
    postId: typeof maybeData.postId === 'string' ? maybeData.postId : undefined,
    deepLink: typeof maybeData.deepLink === 'string' ? maybeData.deepLink : undefined,
  };
}

/**
 * Set the navigation reference for deep linking
 * Call this from your root navigation container
 */
export function setNavigationRef(ref: NavigationRef): void {
  navigationRef = ref;
}

/**
 * Main handler for notification responses (when user taps a notification)
 */
export function handleNotificationResponse(
  response: Notifications.NotificationResponse
): void {
  const data = toNotificationData(response.notification.request.content.data);

  if (!data?.type) {
    logger.warn('Notification received without type data');
    return;
  }

  // Check if this notification type is enabled in preferences
  const { isNotificationTypeEnabled } = useNotificationStore.getState();
  if (!isNotificationTypeEnabled(data.type)) {
    return;
  }

  // Route to appropriate handler
  switch (data.type) {
    case NotificationType.COURSE_UPDATE:
      handleCourseUpdate(data);
      break;
    case NotificationType.MESSAGE:
      handleMessage(data);
      break;
    case NotificationType.LEARNING_REMINDER:
      handleLearningReminder(data);
      break;
    case NotificationType.ACHIEVEMENT_UNLOCK:
      handleAchievementUnlock(data);
      break;
    case NotificationType.COMMUNITY_ACTIVITY:
      handleCommunityActivity(data);
      break;
    default:
      logger.warn('Unknown notification type:', data.type);
  }
}

/**
 * Handle course update notifications
 * Deep links to: teachlink://course/:id
 */
export function handleCourseUpdate(data: NotificationData): void {
  if (!navigationRef?.isReady()) {
    logger.warn('Navigation not ready for course update');
    return;
  }

  if (data.courseId) {
    navigationRef.navigate('CourseDetail', { courseId: data.courseId });
  } else {
    // Fallback to courses list
    navigationRef.navigate('Courses');
  }
}

/**
 * Handle message notifications
 * Deep links to: teachlink://messages/:conversationId
 */
export function handleMessage(data: NotificationData): void {
  if (!navigationRef?.isReady()) {
    logger.warn('Navigation not ready for message');
    return;
  }

  if (data.conversationId) {
    navigationRef.navigate('Chat', { conversationId: data.conversationId });
  } else {
    // Fallback to messages list
    navigationRef.navigate('Messages');
  }
}

/**
 * Handle learning reminder notifications
 * Deep links to: teachlink://learn
 */
export function handleLearningReminder(data: NotificationData): void {
  if (!navigationRef?.isReady()) {
    logger.warn('Navigation not ready for learning reminder');
    return;
  }

  // Navigate to learning dashboard or continue learning screen
  navigationRef.navigate('Learning');
}

/**
 * Handle achievement unlock notifications
 * Deep links to: teachlink://achievements/:id
 */
export function handleAchievementUnlock(data: NotificationData): void {
  if (!navigationRef?.isReady()) {
    logger.warn('Navigation not ready for achievement');
    return;
  }

  if (data.achievementId) {
    navigationRef.navigate('AchievementDetail', { achievementId: data.achievementId });
  } else {
    // Fallback to achievements list
    navigationRef.navigate('Achievements');
  }
}

/**
 * Handle community activity notifications
 * Deep links to: teachlink://community/:postId
 */
export function handleCommunityActivity(data: NotificationData): void {
  if (!navigationRef?.isReady()) {
    logger.warn('Navigation not ready for community activity');
    return;
  }

  if (data.postId) {
    navigationRef.navigate('CommunityPost', { postId: data.postId });
  } else {
    // Fallback to community feed
    navigationRef.navigate('Community');
  }
}

/**
 * Handle notification received while app is in foreground
 * Stores the notification and optionally shows in-app UI
 */
export function handleNotificationReceived(
  notification: Notifications.Notification
): void {
  const { title, body, data } = notification.request.content;
  const notificationData = toNotificationData(data);

  // Check if this notification type is enabled
  if (notificationData?.type) {
    const { isNotificationTypeEnabled, addNotification } = useNotificationStore.getState();

    if (!isNotificationTypeEnabled(notificationData.type)) {
      return;
    }

    // Store the notification
    addNotification({
      type: notificationData.type,
      title: title || 'Notification',
      body: body || '',
      data: notificationData,
    });
  }
}

/**
 * Build deep link URL from notification data
 */
export function buildDeepLink(data: NotificationData): string {
  const baseUrl = 'teachlink://';

  switch (data.type) {
    case NotificationType.COURSE_UPDATE:
      return data.courseId ? `${baseUrl}course/${data.courseId}` : `${baseUrl}courses`;
    case NotificationType.MESSAGE:
      return data.conversationId
        ? `${baseUrl}messages/${data.conversationId}`
        : `${baseUrl}messages`;
    case NotificationType.LEARNING_REMINDER:
      return `${baseUrl}learn`;
    case NotificationType.ACHIEVEMENT_UNLOCK:
      return data.achievementId
        ? `${baseUrl}achievements/${data.achievementId}`
        : `${baseUrl}achievements`;
    case NotificationType.COMMUNITY_ACTIVITY:
      return data.postId ? `${baseUrl}community/${data.postId}` : `${baseUrl}community`;
    default:
      return baseUrl;
  }
}

/**
 * Parse deep link URL to notification data
 */
export function parseDeepLink(url: string): NotificationData | null {
  try {
    const cleanUrl = url.replace('teachlink://', '');
    const parts = cleanUrl.split('/');
    const route = parts[0];
    const id = parts[1];

    switch (route) {
      case 'course':
        return { type: NotificationType.COURSE_UPDATE, courseId: id };
      case 'courses':
        return { type: NotificationType.COURSE_UPDATE };
      case 'messages':
        return { type: NotificationType.MESSAGE, conversationId: id };
      case 'learn':
        return { type: NotificationType.LEARNING_REMINDER };
      case 'achievements':
        return { type: NotificationType.ACHIEVEMENT_UNLOCK, achievementId: id };
      case 'community':
        return { type: NotificationType.COMMUNITY_ACTIVITY, postId: id };
      default:
        return null;
    }
  } catch (error) {
    logger.error('Error parsing deep link:', error);
    return null;
  }
}
