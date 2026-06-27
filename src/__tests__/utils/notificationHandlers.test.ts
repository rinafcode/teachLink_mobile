import { NotificationType, NotificationData } from '../../types/notifications';
import {
  setNavigationRef,
  handleCourseUpdate,
  handleMessage,
  handleLearningReminder,
  handleAchievementUnlock,
  handleCommunityActivity,
  buildDeepLink,
  parseDeepLink,
  validateNotificationPayload,
} from '../../utils/notificationHandlers';

describe('notificationHandlers', () => {
  const mockNavigate = jest.fn();
  const mockIsReady = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsReady.mockReturnValue(true); // Reset to true before each test
    setNavigationRef({
      navigate: mockNavigate,
      isReady: mockIsReady,
    });
  });

  describe('handleCourseUpdate', () => {
    it('should navigate to CourseDetail when courseId is provided', () => {
      const data: NotificationData = {
        type: NotificationType.COURSE_UPDATE,
        courseId: 'course-123',
      };

      handleCourseUpdate(data);

      expect(mockNavigate).toHaveBeenCalledWith('CourseDetail', { courseId: 'course-123' });
    });

    it('should navigate to Courses list when no courseId', () => {
      const data: NotificationData = {
        type: NotificationType.COURSE_UPDATE,
      };

      handleCourseUpdate(data);

      expect(mockNavigate).toHaveBeenCalledWith('Courses');
    });

    it('should not navigate when navigation is not ready', () => {
      mockIsReady.mockReturnValue(false);
      const data: NotificationData = {
        type: NotificationType.COURSE_UPDATE,
        courseId: 'course-123',
      };

      handleCourseUpdate(data);

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('handleMessage', () => {
    it('should navigate to Chat when conversationId is provided', () => {
      const data: NotificationData = {
        type: NotificationType.MESSAGE,
        conversationId: 'conv-456',
      };

      handleMessage(data);

      expect(mockNavigate).toHaveBeenCalledWith('Chat', { conversationId: 'conv-456' });
    });

    it('should navigate to Messages list when no conversationId', () => {
      const data: NotificationData = {
        type: NotificationType.MESSAGE,
      };

      handleMessage(data);

      expect(mockNavigate).toHaveBeenCalledWith('Messages');
    });
  });

  describe('handleLearningReminder', () => {
    it('should navigate to Learning screen', () => {
      const data: NotificationData = {
        type: NotificationType.LEARNING_REMINDER,
      };

      handleLearningReminder(data);

      expect(mockNavigate).toHaveBeenCalledWith('Learning');
    });
  });

  describe('handleAchievementUnlock', () => {
    it('should navigate to AchievementDetail when achievementId is provided', () => {
      const data: NotificationData = {
        type: NotificationType.ACHIEVEMENT_UNLOCK,
        achievementId: 'achievement-789',
      };

      handleAchievementUnlock(data);

      expect(mockNavigate).toHaveBeenCalledWith('AchievementDetail', {
        achievementId: 'achievement-789',
      });
    });

    it('should navigate to Achievements list when no achievementId', () => {
      const data: NotificationData = {
        type: NotificationType.ACHIEVEMENT_UNLOCK,
      };

      handleAchievementUnlock(data);

      expect(mockNavigate).toHaveBeenCalledWith('Achievements');
    });
  });

  describe('handleCommunityActivity', () => {
    it('should navigate to CommunityPost when postId is provided', () => {
      const data: NotificationData = {
        type: NotificationType.COMMUNITY_ACTIVITY,
        postId: 'post-101',
      };

      handleCommunityActivity(data);

      expect(mockNavigate).toHaveBeenCalledWith('CommunityPost', { postId: 'post-101' });
    });

    it('should navigate to Community feed when no postId', () => {
      const data: NotificationData = {
        type: NotificationType.COMMUNITY_ACTIVITY,
      };

      handleCommunityActivity(data);

      expect(mockNavigate).toHaveBeenCalledWith('Community');
    });
  });

  describe('buildDeepLink', () => {
    it('should build course deep link with id', () => {
      const data: NotificationData = {
        type: NotificationType.COURSE_UPDATE,
        courseId: 'course-123',
      };

      expect(buildDeepLink(data)).toBe('teachlink://course/course-123');
    });

    it('should build courses list deep link without id', () => {
      const data: NotificationData = {
        type: NotificationType.COURSE_UPDATE,
      };

      expect(buildDeepLink(data)).toBe('teachlink://courses');
    });

    it('should build message deep link with conversationId', () => {
      const data: NotificationData = {
        type: NotificationType.MESSAGE,
        conversationId: 'conv-456',
      };

      expect(buildDeepLink(data)).toBe('teachlink://messages/conv-456');
    });

    it('should build learning reminder deep link', () => {
      const data: NotificationData = {
        type: NotificationType.LEARNING_REMINDER,
      };

      expect(buildDeepLink(data)).toBe('teachlink://learn');
    });

    it('should build achievement deep link with id', () => {
      const data: NotificationData = {
        type: NotificationType.ACHIEVEMENT_UNLOCK,
        achievementId: 'ach-789',
      };

      expect(buildDeepLink(data)).toBe('teachlink://achievements/ach-789');
    });

    it('should build community deep link with postId', () => {
      const data: NotificationData = {
        type: NotificationType.COMMUNITY_ACTIVITY,
        postId: 'post-101',
      };

      expect(buildDeepLink(data)).toBe('teachlink://community/post-101');
    });
  });

  describe('parseDeepLink', () => {
    it('should parse course deep link', () => {
      const result = parseDeepLink('teachlink://course/course-123');

      expect(result).toEqual({
        type: NotificationType.COURSE_UPDATE,
        courseId: 'course-123',
      });
    });

    it('should parse courses list deep link', () => {
      const result = parseDeepLink('teachlink://courses');

      expect(result).toEqual({
        type: NotificationType.COURSE_UPDATE,
      });
    });

    it('should parse message deep link', () => {
      const result = parseDeepLink('teachlink://messages/conv-456');

      expect(result).toEqual({
        type: NotificationType.MESSAGE,
        conversationId: 'conv-456',
      });
    });

    it('should parse learning deep link', () => {
      const result = parseDeepLink('teachlink://learn');

      expect(result).toEqual({
        type: NotificationType.LEARNING_REMINDER,
      });
    });

    it('should parse achievement deep link', () => {
      const result = parseDeepLink('teachlink://achievements/ach-789');

      expect(result).toEqual({
        type: NotificationType.ACHIEVEMENT_UNLOCK,
        achievementId: 'ach-789',
      });
    });

    it('should parse community deep link', () => {
      const result = parseDeepLink('teachlink://community/post-101');

      expect(result).toEqual({
        type: NotificationType.COMMUNITY_ACTIVITY,
        postId: 'post-101',
      });
    });

    it('should return null for unknown deep link', () => {
      const result = parseDeepLink('teachlink://unknown/path');

      expect(result).toBeNull();
    });
  });
});

describe('validateNotificationPayload', () => {
  it('returns a valid NotificationData for a clean payload', () => {
    const raw = { type: NotificationType.COURSE_UPDATE, courseId: 'c-1' };
    const result = validateNotificationPayload(raw);
    expect(result).toEqual({ type: NotificationType.COURSE_UPDATE, courseId: 'c-1' });
  });

  it('strips unknown extra fields (only allow-list survives)', () => {
    const raw = {
      type: NotificationType.MESSAGE,
      conversationId: 'conv-1',
      extraField: 'should-be-dropped',
      nested: { deep: true },
    };
    const result = validateNotificationPayload(raw);
    expect(result).toEqual({ type: NotificationType.MESSAGE, conversationId: 'conv-1' });
    expect(result).not.toHaveProperty('extraField');
    expect(result).not.toHaveProperty('nested');
  });

  it('returns undefined for null input', () => {
    expect(validateNotificationPayload(null)).toBeUndefined();
  });

  it('returns undefined for non-object input', () => {
    expect(validateNotificationPayload('string')).toBeUndefined();
    expect(validateNotificationPayload(42)).toBeUndefined();
    expect(validateNotificationPayload(undefined)).toBeUndefined();
  });

  it('returns undefined for arrays', () => {
    expect(validateNotificationPayload([])).toBeUndefined();
    expect(validateNotificationPayload([{ type: NotificationType.MESSAGE }])).toBeUndefined();
  });

  it('returns undefined when type is invalid', () => {
    expect(validateNotificationPayload({ type: 'invalid_type' })).toBeUndefined();
    expect(validateNotificationPayload({ type: 123 })).toBeUndefined();
    expect(validateNotificationPayload({})).toBeUndefined();
  });

  // Prototype pollution vectors
  it('rejects payload containing __proto__ key', () => {
    const raw = JSON.parse('{"type":"course_update","__proto__":{"polluted":true}}');
    const result = validateNotificationPayload(raw);
    expect(result).toBeUndefined();
  });

  it('rejects payload containing constructor key', () => {
    const raw = { type: NotificationType.COURSE_UPDATE, constructor: { name: 'Object' } };
    const result = validateNotificationPayload(raw as unknown as Record<string, unknown>);
    expect(result).toBeUndefined();
  });

  it('rejects payload containing prototype key', () => {
    const raw = { type: NotificationType.COURSE_UPDATE, prototype: { polluted: true } };
    const result = validateNotificationPayload(raw as unknown as Record<string, unknown>);
    expect(result).toBeUndefined();
  });

  it('does not pollute Object.prototype when __proto__ key is present in raw JSON', () => {
    const before = (Object.prototype as Record<string, unknown>).polluted;
    JSON.parse('{"type":"course_update","__proto__":{"polluted":true}}');
    expect((Object.prototype as Record<string, unknown>).polluted).toBe(before);
  });

  it('returns undefined for optional string fields when value is not a string', () => {
    const raw = {
      type: NotificationType.COURSE_UPDATE,
      courseId: 12345, // number — should be dropped
    };
    const result = validateNotificationPayload(raw);
    expect(result).toBeDefined();
    expect(result?.courseId).toBeUndefined();
  });

  it('preserves all valid optional fields', () => {
    const raw = {
      type: NotificationType.COMMUNITY_ACTIVITY,
      postId: 'p-1',
      deepLink: 'teachlink://community/p-1',
    };
    const result = validateNotificationPayload(raw);
    expect(result).toEqual({
      type: NotificationType.COMMUNITY_ACTIVITY,
      postId: 'p-1',
      deepLink: 'teachlink://community/p-1',
    });
  });
});
