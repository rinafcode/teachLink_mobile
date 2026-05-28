import { useNotificationStore } from '../../store/notificationStore';
import { NotificationType, DEFAULT_NOTIFICATION_PREFERENCES } from '../../types/notifications';

// Helper to get fresh store state
const getStore = () => useNotificationStore.getState();

describe('notificationStore', () => {
  beforeEach(() => {
    // Reset the store before each test
    useNotificationStore.setState({
      pushToken: null,
      isTokenRegistered: false,
      tokenLastUpdated: null,
      hasPromptedForPermission: false,
      permissionDeniedAt: null,
      preferences: DEFAULT_NOTIFICATION_PREFERENCES,
      notifications: [],
      unreadCount: 0,
    });
  });

  describe('Push Token Management', () => {
    it('should set push token', () => {
      getStore().setPushToken('test-token-123');

      expect(getStore().pushToken).toBe('test-token-123');
      expect(getStore().tokenLastUpdated).not.toBeNull();
    });

    it('should set token registered status', () => {
      getStore().setTokenRegistered(true);

      expect(getStore().isTokenRegistered).toBe(true);
    });

    it('should clear push token', () => {
      getStore().setPushToken('test-token');
      getStore().setTokenRegistered(true);
      getStore().clearPushToken();

      expect(getStore().pushToken).toBeNull();
      expect(getStore().isTokenRegistered).toBe(false);
      expect(getStore().tokenLastUpdated).toBeNull();
    });
  });

  describe('Permission State', () => {
    it('should set hasPromptedForPermission', () => {
      getStore().setHasPromptedForPermission(true);

      expect(getStore().hasPromptedForPermission).toBe(true);
    });

    it('should set permissionDeniedAt', () => {
      const date = new Date().toISOString();
      getStore().setPermissionDeniedAt(date);

      expect(getStore().permissionDeniedAt).toBe(date);
    });
  });

  describe('Notification Preferences', () => {
    it('should have default preferences', () => {
      expect(getStore().preferences).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
    });

    it('should update individual preference', () => {
      getStore().setPreference('courseUpdates', false);

      expect(getStore().preferences.courseUpdates).toBe(false);
      expect(getStore().preferences.messages).toBe(true);
    });

    it('should set all preferences at once', () => {
      const newPreferences = {
        courseUpdates: false,
        messages: false,
        learningReminders: false,
        achievementUnlocks: false,
        communityActivity: true,
      };

      getStore().setAllPreferences(newPreferences);

      expect(getStore().preferences).toEqual(newPreferences);
    });

    it('should reset preferences to defaults', () => {
      getStore().setPreference('courseUpdates', false);
      getStore().setPreference('messages', false);
      getStore().resetPreferences();

      expect(getStore().preferences).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
    });

    it('should check if notification type is enabled', () => {
      expect(getStore().isNotificationTypeEnabled(NotificationType.COURSE_UPDATE)).toBe(true);
      expect(getStore().isNotificationTypeEnabled(NotificationType.COMMUNITY_ACTIVITY)).toBe(false);

      getStore().setPreference('courseUpdates', false);

      expect(getStore().isNotificationTypeEnabled(NotificationType.COURSE_UPDATE)).toBe(false);
    });
  });

  describe('Notification Storage', () => {
    it('should add notification', () => {
      getStore().addNotification({
        type: NotificationType.COURSE_UPDATE,
        title: 'New Course',
        body: 'A new course is available',
      });

      expect(getStore().notifications).toHaveLength(1);
      expect(getStore().notifications[0].title).toBe('New Course');
      expect(getStore().notifications[0].read).toBe(false);
      expect(getStore().unreadCount).toBe(1);
    });

    it('should mark notification as read', () => {
      getStore().addNotification({
        type: NotificationType.MESSAGE,
        title: 'New Message',
        body: 'You have a new message',
      });

      const notificationId = getStore().notifications[0].id;
      getStore().markAsRead(notificationId);

      expect(getStore().notifications[0].read).toBe(true);
      expect(getStore().unreadCount).toBe(0);
    });

    it('should mark all notifications as read', () => {
      getStore().addNotification({
        type: NotificationType.MESSAGE,
        title: 'Message 1',
        body: 'Body 1',
      });
      getStore().addNotification({
        type: NotificationType.MESSAGE,
        title: 'Message 2',
        body: 'Body 2',
      });

      expect(getStore().unreadCount).toBe(2);

      getStore().markAllAsRead();

      expect(getStore().unreadCount).toBe(0);
      expect(getStore().notifications.every(n => n.read)).toBe(true);
    });

    it('should remove notification', () => {
      getStore().addNotification({
        type: NotificationType.ACHIEVEMENT_UNLOCK,
        title: 'Achievement',
        body: 'You unlocked an achievement',
      });

      const notificationId = getStore().notifications[0].id;
      getStore().removeNotification(notificationId);

      expect(getStore().notifications).toHaveLength(0);
      expect(getStore().unreadCount).toBe(0);
    });

    it('should clear all notifications', () => {
      getStore().addNotification({
        type: NotificationType.MESSAGE,
        title: 'Message 1',
        body: 'Body 1',
      });
      getStore().addNotification({
        type: NotificationType.MESSAGE,
        title: 'Message 2',
        body: 'Body 2',
      });

      getStore().clearAllNotifications();

      expect(getStore().notifications).toHaveLength(0);
      expect(getStore().unreadCount).toBe(0);
    });

    it('should limit stored notifications to 100', () => {
      for (let i = 0; i < 105; i++) {
        getStore().addNotification({
          type: NotificationType.MESSAGE,
          title: `Message ${i}`,
          body: `Body ${i}`,
        });
      }

      expect(getStore().notifications).toHaveLength(100);
    });
  });
});
