import { useNotificationStore } from '../../src/store/notificationStore';
import {
    DEFAULT_NOTIFICATION_PREFERENCES,
    NotificationType,
} from '../../src/types/notifications';

describe('notificationStore', () => {
    beforeEach(() => {
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

    it('sets push token and registration state', () => {
        const state = useNotificationStore.getState();

        state.setPushToken('test-token');
        state.setTokenRegistered(true);

        const next = useNotificationStore.getState();
        expect(next.pushToken).toBe('test-token');
        expect(next.isTokenRegistered).toBe(true);
        expect(next.tokenLastUpdated).toEqual(expect.any(String));
    });

    it('adds notification and updates unread count', () => {
        const state = useNotificationStore.getState();

        state.addNotification({
            type: NotificationType.MESSAGE,
            title: 'New Message',
            body: 'You have a new message',
        });

        const next = useNotificationStore.getState();
        expect(next.notifications).toHaveLength(1);
        expect(next.notifications[0].read).toBe(false);
        expect(next.unreadCount).toBe(1);
    });

    it('respects preference checks by notification type', () => {
        const state = useNotificationStore.getState();

        state.setPreference('messages', false);

        const next = useNotificationStore.getState();
        expect(next.isNotificationTypeEnabled(NotificationType.MESSAGE)).toBe(false);
        expect(next.isNotificationTypeEnabled(NotificationType.COURSE_UPDATE)).toBe(true);
    });
});
