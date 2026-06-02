export enum NotificationType {
  COURSE_UPDATE = 'course_update',
  MESSAGE = 'message',
  LEARNING_REMINDER = 'learning_reminder',
  ACHIEVEMENT_UNLOCK = 'achievement_unlock',
  COMMUNITY_ACTIVITY = 'community_activity',
}

export interface NotificationPreferences {
  courseUpdates: boolean;
  messages: boolean;
  learningReminders: boolean;
  achievementUnlocks: boolean;
  communityActivity: boolean;
}

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  data?: NotificationData;
}

export interface NotificationData {
  type: NotificationType;
  courseId?: string;
  conversationId?: string;
  achievementId?: string;
  postId?: string;
  deepLink?: string;
}

export interface StoredNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: NotificationData;
  receivedAt: string;
  read: boolean;
  groupCount?: number;
}

export interface NotificationHistoryEntry {
  fingerprint: string;
  receivedAt: string;
}

export interface PushTokenState {
  token: string | null;
  isRegistered: boolean;
  lastUpdated: string | null;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  courseUpdates: true,
  messages: true,
  learningReminders: true,
  achievementUnlocks: true,
  communityActivity: false,
};
