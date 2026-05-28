import * as Notifications from 'expo-notifications';

import {
  addNotificationReceivedListener,
  addNotificationResponseListener,
  cancelAllScheduledNotifications,
  cancelScheduledNotification,
  clearBadgeCount,
  getBadgeCount,
  getChannelId,
  removeNotificationListener,
  scheduleLocalNotification,
  setBadgeCount,
} from '../../services/pushNotifications';
import { NotificationData, NotificationType } from '../../types/notifications';

describe('pushNotifications service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getChannelId', () => {
    it('should return course-updates for COURSE_UPDATE', () => {
      expect(getChannelId(NotificationType.COURSE_UPDATE)).toBe('course-updates');
    });

    it('should return messages for MESSAGE', () => {
      expect(getChannelId(NotificationType.MESSAGE)).toBe('messages');
    });

    it('should return reminders for LEARNING_REMINDER', () => {
      expect(getChannelId(NotificationType.LEARNING_REMINDER)).toBe('reminders');
    });

    it('should return achievements for ACHIEVEMENT_UNLOCK', () => {
      expect(getChannelId(NotificationType.ACHIEVEMENT_UNLOCK)).toBe('achievements');
    });

    it('should return community for COMMUNITY_ACTIVITY', () => {
      expect(getChannelId(NotificationType.COMMUNITY_ACTIVITY)).toBe('community');
    });

    it('should return default for unknown type', () => {
      expect(getChannelId('unknown' as NotificationType)).toBe('default');
    });
  });

  describe('scheduleLocalNotification', () => {
    it('should schedule a notification with correct parameters', async () => {
      const mockSchedule = Notifications.scheduleNotificationAsync as jest.Mock;
      mockSchedule.mockResolvedValue('notification-id-123');

      const data: NotificationData = {
        type: NotificationType.COURSE_UPDATE,
        courseId: 'course-123',
      };

      const result = await scheduleLocalNotification(
        'New Course Available',
        'Check out our latest course',
        data
      );

      expect(result).toBe('notification-id-123');
      expect(mockSchedule).toHaveBeenCalledWith({
        content: expect.objectContaining({
          title: 'New Course Available',
          body: 'Check out our latest course',
          sound: true,
        }),
        trigger: null,
      });
    });

    it('should schedule a notification with custom trigger', async () => {
      const mockSchedule = Notifications.scheduleNotificationAsync as jest.Mock;
      mockSchedule.mockResolvedValue('notification-id-456');

      const data: NotificationData = {
        type: NotificationType.LEARNING_REMINDER,
      };

      const trigger: Notifications.TimeIntervalTriggerInput = {
        type: 'timeInterval' as unknown as Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 60,
      };

      await scheduleLocalNotification(
        'Time to Learn',
        'Continue your learning journey',
        data,
        trigger
      );

      expect(mockSchedule).toHaveBeenCalledWith({
        content: expect.anything(),
        trigger,
      });
    });
  });

  describe('cancelScheduledNotification', () => {
    it('should cancel a specific notification', async () => {
      const mockCancel = Notifications.cancelScheduledNotificationAsync as jest.Mock;

      await cancelScheduledNotification('notification-id-123');

      expect(mockCancel).toHaveBeenCalledWith('notification-id-123');
    });
  });

  describe('cancelAllScheduledNotifications', () => {
    it('should cancel all notifications', async () => {
      const mockCancelAll = Notifications.cancelAllScheduledNotificationsAsync as jest.Mock;

      await cancelAllScheduledNotifications();

      expect(mockCancelAll).toHaveBeenCalled();
    });
  });

  describe('badge count management', () => {
    it('should get badge count', async () => {
      const mockGetBadge = Notifications.getBadgeCountAsync as jest.Mock;
      mockGetBadge.mockResolvedValue(5);

      const count = await getBadgeCount();

      expect(count).toBe(5);
      expect(mockGetBadge).toHaveBeenCalled();
    });

    it('should set badge count', async () => {
      const mockSetBadge = Notifications.setBadgeCountAsync as jest.Mock;

      await setBadgeCount(10);

      expect(mockSetBadge).toHaveBeenCalledWith(10);
    });

    it('should clear badge count', async () => {
      const mockSetBadge = Notifications.setBadgeCountAsync as jest.Mock;

      await clearBadgeCount();

      expect(mockSetBadge).toHaveBeenCalledWith(0);
    });
  });

  describe('notification listeners', () => {
    it('should add notification received listener', () => {
      const callback = jest.fn();
      const mockAddListener = Notifications.addNotificationReceivedListener as jest.Mock;
      const mockSubscription = { remove: jest.fn() };
      mockAddListener.mockReturnValue(mockSubscription);

      const subscription = addNotificationReceivedListener(callback);

      expect(mockAddListener).toHaveBeenCalledWith(callback);
      expect(subscription).toBe(mockSubscription);
    });

    it('should add notification response listener', () => {
      const callback = jest.fn();
      const mockAddListener = Notifications.addNotificationResponseReceivedListener as jest.Mock;
      const mockSubscription = { remove: jest.fn() };
      mockAddListener.mockReturnValue(mockSubscription);

      const subscription = addNotificationResponseListener(callback);

      expect(mockAddListener).toHaveBeenCalledWith(callback);
      expect(subscription).toBe(mockSubscription);
    });

    it('should remove notification listener', () => {
      const mockRemove = jest.fn();
      const mockSubscription = { remove: jest.fn() } as unknown as Notifications.Subscription;
      (mockSubscription as { remove: jest.Mock }).remove = mockRemove;

      removeNotificationListener(mockSubscription);

      expect(mockRemove).toHaveBeenCalledTimes(1);
    });
  });
});
