import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  NotificationPreferences,
  StoredNotification,
  DEFAULT_NOTIFICATION_PREFERENCES,
  NotificationType,
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
          const newNotification: StoredNotification = {
            ...notification,
            id: generateId(),
            receivedAt: new Date().toISOString(),
            read: false,
          };

          return {
            notifications: [newNotification, ...state.notifications].slice(0, 100), // Keep last 100
            unreadCount: state.unreadCount + 1,
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
        lastEngagedAt: state.lastEngagedAt,
        lastNotificationSentAtByType: state.lastNotificationSentAtByType,
      }),
    }
  )
);

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
