import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
    DEFAULT_NOTIFICATION_PREFERENCES,
    NotificationData,
    NotificationHistoryEntry,
    NotificationPreferences,
    NotificationType,
    StoredNotification,
} from '../types/notifications';

interface NotificationState {
  // Push token state
  pushToken: string | null;
  isTokenRegistered: boolean;
  tokenLastUpdated: string | null;

  // Permission state
  hasPromptedForPermission: boolean;
  permissionDeniedAt: string | null;

  // Notification preferences
  preferences: NotificationPreferences;

  // Received notifications
  notifications: StoredNotification[];
  unreadCount: number;
  notificationHistory: NotificationHistoryEntry[];
  lastEngagedAt: string | null;
  lastNotificationSentAtByType: Partial<Record<NotificationType, string>>;

  // Actions - Push token
  setPushToken: (token: string | null) => void;
  setTokenRegistered: (registered: boolean) => void;
  clearPushToken: () => void;

  // Actions - Permission
  setHasPromptedForPermission: (prompted: boolean) => void;
  setPermissionDeniedAt: (date: string | null) => void;

  // Actions - Preferences
  setPreference: (key: keyof NotificationPreferences, value: boolean) => void;
  setAllPreferences: (preferences: NotificationPreferences) => void;
  resetPreferences: () => void;

  // Actions - Notifications
  addNotification: (notification: Omit<StoredNotification, 'id' | 'receivedAt' | 'read'>) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  removeNotification: (notificationId: string) => void;
  clearAllNotifications: () => void;
  recordEngagement: () => void;
  shouldThrottleNotification: (type: NotificationType, now?: Date) => boolean;
  getNotificationThrottleMinutes: (now?: Date) => number;

  // Helpers
  isNotificationTypeEnabled: (type: NotificationType) => boolean;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      // Initial state
      pushToken: null,
      isTokenRegistered: false,
      tokenLastUpdated: null,
      hasPromptedForPermission: false,
      permissionDeniedAt: null,
      preferences: DEFAULT_NOTIFICATION_PREFERENCES,
      notifications: [],
      unreadCount: 0,
      notificationHistory: [],
      lastEngagedAt: null,
      lastNotificationSentAtByType: {},

      // Push token actions
      setPushToken: (token) =>
        set({
          pushToken: token,
          tokenLastUpdated: token ? new Date().toISOString() : null,
        }),

      setTokenRegistered: (registered) =>
        set({ isTokenRegistered: registered }),

      clearPushToken: () =>
        set({
          pushToken: null,
          isTokenRegistered: false,
          tokenLastUpdated: null,
        }),

      // Permission actions
      setHasPromptedForPermission: (prompted) =>
        set({ hasPromptedForPermission: prompted }),

      setPermissionDeniedAt: (date) =>
        set({ permissionDeniedAt: date }),

      // Preference actions
      setPreference: (key, value) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            [key]: value,
          },
        })),

      setAllPreferences: (preferences) =>
        set({ preferences }),

      resetPreferences: () =>
        set({ preferences: DEFAULT_NOTIFICATION_PREFERENCES }),

      // Notification actions
      addNotification: (notification) =>
        set((state) => {
          const now = new Date().toISOString();
          const fingerprint = buildNotificationFingerprint(notification);
          const dedupeWindowMinutes = 10;
          const cutoff = new Date(Date.now() - dedupeWindowMinutes * 60 * 1000);

          const recentHistory = state.notificationHistory.filter(
            (entry) => new Date(entry.receivedAt).getTime() >= cutoff.getTime()
          );

          const isDuplicate = recentHistory.some((entry) => entry.fingerprint === fingerprint);
          if (isDuplicate) {
            return {
              notificationHistory: [{ fingerprint, receivedAt: now }, ...recentHistory].slice(0, 200),
            };
          }

          const groupKey = buildNotificationGroupKey(notification.type, notification.data);
          const existingIndex = state.notifications.findIndex((item) =>
            buildNotificationGroupKey(item.type, item.data) === groupKey
          );

          let notifications: StoredNotification[];

          if (existingIndex >= 0) {
            const existing = state.notifications[existingIndex];
            const groupCount = (existing.groupCount ?? 1) + 1;
            const title = formatGroupedTitle(notification.type, groupCount, existing.title, notification.title);
            const body = formatGroupedBody(existing.body, notification.body, groupCount);

            const updatedNotification: StoredNotification = {
              ...existing,
              title,
              body,
              groupCount,
              read: false,
              receivedAt: now,
            };

            notifications = [updatedNotification, ...state.notifications.filter((_, index) => index !== existingIndex)];
          } else {
            const newNotification: StoredNotification = {
              ...notification,
              id: generateId(),
              receivedAt: now,
              read: false,
              groupCount: 1,
            };

            notifications = [newNotification, ...state.notifications].slice(0, 100);
          }

          const notificationHistory = [{ fingerprint, receivedAt: now }, ...recentHistory].slice(0, 200);

          return {
            notifications,
            unreadCount: state.unreadCount + 1,
            notificationHistory,
          };
        }),

      markAsRead: (notificationId) =>
        set((state) => {
          const notification = state.notifications.find((n) => n.id === notificationId);
          if (!notification || notification.read) return state;

          return {
            notifications: state.notifications.map((n) =>
              n.id === notificationId ? { ...n, read: true } : n
            ),
            unreadCount: Math.max(0, state.unreadCount - 1),
          };
        }),

      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        })),

      removeNotification: (notificationId) =>
        set((state) => {
          const notification = state.notifications.find((n) => n.id === notificationId);
          const wasUnread = notification && !notification.read;

          return {
            notifications: state.notifications.filter((n) => n.id !== notificationId),
            unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
          };
        }),

      clearAllNotifications: () =>
        set({
          notifications: [],
          unreadCount: 0,
          notificationHistory: [],
        }),

      recordEngagement: () =>
        set({
          lastEngagedAt: new Date().toISOString(),
        }),

      shouldThrottleNotification: (type, now = new Date()) => {
        const state = get();
        const thresholdMinutes = state.getNotificationThrottleMinutes(now);
        const lastSentAt = state.lastNotificationSentAtByType[type];

        if (lastSentAt) {
          const elapsedMinutes =
            (now.getTime() - new Date(lastSentAt).getTime()) / (1000 * 60);
          if (elapsedMinutes < thresholdMinutes) {
            return true;
          }
        }

        set({
          lastNotificationSentAtByType: {
            ...state.lastNotificationSentAtByType,
            [type]: now.toISOString(),
          },
        });
        return false;
      },

      getNotificationThrottleMinutes: (now = new Date()) => {
        const { lastEngagedAt } = get();
        if (!lastEngagedAt) {
          return 180;
        }

        const inactiveHours =
          (now.getTime() - new Date(lastEngagedAt).getTime()) / (1000 * 60 * 60);

        if (inactiveHours < 24) return 5;
        if (inactiveHours < 72) return 30;
        return 180;
      },

      // Helpers
      isNotificationTypeEnabled: (type) => {
        const { preferences } = get();
        switch (type) {
          case NotificationType.COURSE_UPDATE:
            return preferences.courseUpdates;
          case NotificationType.MESSAGE:
            return preferences.messages;
          case NotificationType.LEARNING_REMINDER:
            return preferences.learningReminders;
          case NotificationType.ACHIEVEMENT_UNLOCK:
            return preferences.achievementUnlocks;
          case NotificationType.COMMUNITY_ACTIVITY:
            return preferences.communityActivity;
          default:
            return true;
        }
      },
    }),
    {
      name: 'notification-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist these fields
        pushToken: state.pushToken,
        isTokenRegistered: state.isTokenRegistered,
        tokenLastUpdated: state.tokenLastUpdated,
        hasPromptedForPermission: state.hasPromptedForPermission,
        permissionDeniedAt: state.permissionDeniedAt,
        preferences: state.preferences,
        notifications: state.notifications,
        unreadCount: state.unreadCount,
        notificationHistory: state.notificationHistory,
        lastEngagedAt: state.lastEngagedAt,
        lastNotificationSentAtByType: state.lastNotificationSentAtByType,
      }),
    }
  )
);

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function getNotificationTargetKey(type: NotificationType, data?: NotificationData): string {
  if (!data) return 'global';

  switch (type) {
    case NotificationType.COURSE_UPDATE:
      return data.courseId ? `course:${data.courseId}` : 'course:all';
    case NotificationType.MESSAGE:
      return data.conversationId ? `message:${data.conversationId}` : 'message:all';
    case NotificationType.LEARNING_REMINDER:
      return 'learning_reminder';
    case NotificationType.ACHIEVEMENT_UNLOCK:
      return data.achievementId ? `achievement:${data.achievementId}` : 'achievement:all';
    case NotificationType.COMMUNITY_ACTIVITY:
      return data.postId ? `community:${data.postId}` : 'community:all';
    default:
      return 'global';
  }
}

function buildNotificationGroupKey(type: NotificationType, data?: NotificationData): string {
  return `${type}|${getNotificationTargetKey(type, data)}`;
}

function buildNotificationFingerprint(
  notification: Omit<StoredNotification, 'id' | 'receivedAt' | 'read'>
): string {
  return [
    notification.type,
    getNotificationTargetKey(notification.type, notification.data),
    normalizeText(notification.title),
    normalizeText(notification.body),
  ].join('|');
}

function formatGroupedTitle(
  type: NotificationType,
  count: number,
  existingTitle: string,
  incomingTitle: string
): string {
  if (count <= 1) {
    return incomingTitle;
  }

  switch (type) {
    case NotificationType.MESSAGE:
      return `${count} new messages`;
    case NotificationType.COURSE_UPDATE:
      return `${count} course updates`;
    case NotificationType.ACHIEVEMENT_UNLOCK:
      return `${count} achievements unlocked`;
    case NotificationType.COMMUNITY_ACTIVITY:
      return `${count} community updates`;
    case NotificationType.LEARNING_REMINDER:
      return `${count} learning reminders`;
    default:
      return `${count} new notifications`;
  }
}

function formatGroupedBody(existingBody: string, incomingBody: string, count: number): string {
  if (count <= 1 || existingBody === incomingBody) {
    return incomingBody;
  }

  const merged = [existingBody, incomingBody].filter(Boolean).join('\n');
  return merged.length > 250 ? `${merged.slice(0, 250)}...` : merged;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
