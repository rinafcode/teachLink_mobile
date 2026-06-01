/**
 * Tests for sentryContextService — Automatic production error reporting with context
 *
 * Covers all acceptance criteria:
 *  ✅ Sentry breadcrumbs (navigation, user action, network, auth, lifecycle)
 *  ✅ User and action context capture
 *  ✅ Custom data attached to errors (tags, extra, contexts, fingerprint)
 *  ✅ captureException / captureMessage helpers
 *  ✅ Session reset on logout
 */

import * as Sentry from '@sentry/react-native';
import { sentryContextService } from '../../services/sentryContext';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@sentry/react-native', () => ({
  setUser: jest.fn(),
  setTag: jest.fn(),
  addBreadcrumb: jest.fn(),
  clearBreadcrumbs: jest.fn(),
  captureException: jest.fn().mockReturnValue('mock-event-id'),
  captureMessage: jest.fn().mockReturnValue('mock-message-id'),
}));

const mockSentry = Sentry as jest.Mocked<typeof Sentry>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Reset Sentry mocks and the service's internal state between tests. */
function resetAll() {
  jest.clearAllMocks();
  // Reset internal service state by calling resetSession
  sentryContextService.resetSession();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SentryContextService', () => {
  beforeEach(resetAll);

  // ── User Context ─────────────────────────────────────────────────────────

  describe('setUser', () => {
    it('calls Sentry.setUser with id, email and username', () => {
      sentryContextService.setUser({
        id: 'u-001',
        email: 'ada@teachlink.com',
        username: 'Ada Lovelace',
        role: 'student',
      });

      expect(mockSentry.setUser).toHaveBeenCalledWith({
        id: 'u-001',
        email: 'ada@teachlink.com',
        username: 'Ada Lovelace',
      });
    });

    it('tags user.role on the Sentry scope when role is provided', () => {
      sentryContextService.setUser({ id: 'u-002', role: 'teacher' });

      expect(mockSentry.setTag).toHaveBeenCalledWith('user.role', 'teacher');
    });

    it('does not set role tag when role is absent', () => {
      sentryContextService.setUser({ id: 'u-003' });

      expect(mockSentry.setTag).not.toHaveBeenCalledWith('user.role', expect.anything());
    });

    it('adds an auth breadcrumb recording sign-in', () => {
      sentryContextService.setUser({ id: 'u-004' });

      const breadcrumb = mockSentry.addBreadcrumb.mock.calls.find(
        ([b]) => b.category === 'auth' && b.message?.includes('signed in'),
      )?.[0];

      expect(breadcrumb).toBeDefined();
      expect(breadcrumb?.level).toBe('info');
    });
  });

  describe('clearUser', () => {
    it('clears the Sentry user scope', () => {
      sentryContextService.clearUser();

      expect(mockSentry.setUser).toHaveBeenCalledWith(null);
    });

    it('resets the user.role tag to an empty string', () => {
      sentryContextService.clearUser();

      expect(mockSentry.setTag).toHaveBeenCalledWith('user.role', '');
    });

    it('adds a sign-out breadcrumb', () => {
      sentryContextService.clearUser();

      const breadcrumb = mockSentry.addBreadcrumb.mock.calls.find(
        ([b]) => b.category === 'auth' && b.message?.includes('signed out'),
      )?.[0];

      expect(breadcrumb).toBeDefined();
    });
  });

  // ── Screen Tracking ──────────────────────────────────────────────────────

  describe('trackScreen', () => {
    it('sets screen.current tag and adds a navigation breadcrumb', () => {
      sentryContextService.trackScreen('HomeScreen');

      expect(mockSentry.setTag).toHaveBeenCalledWith('screen.current', 'HomeScreen');
      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'navigation',
          message: 'Navigated to HomeScreen',
          level: 'info',
        }),
      );
    });

    it('includes from/to data in the navigation breadcrumb', () => {
      sentryContextService.trackScreen('CourseScreen');
      jest.clearAllMocks();
      sentryContextService.trackScreen('QuizScreen');

      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ from: 'CourseScreen', to: 'QuizScreen' }),
        }),
      );
    });

    it('uses "app_start" as origin when there is no previous screen', () => {
      sentryContextService.trackScreen('SplashScreen');

      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ from: 'app_start' }),
        }),
      );
    });

    it('exposes the current screen via getCurrentScreen()', () => {
      sentryContextService.trackScreen('SettingsScreen');

      expect(sentryContextService.getCurrentScreen()).toBe('SettingsScreen');
    });

    it('sets screen.previous tag after first navigation', () => {
      sentryContextService.trackScreen('A');
      jest.clearAllMocks();
      sentryContextService.trackScreen('B');

      expect(mockSentry.setTag).toHaveBeenCalledWith('screen.previous', 'A');
    });
  });

  // ── Action Breadcrumbs ───────────────────────────────────────────────────

  describe('trackAction', () => {
    it('adds a user.action breadcrumb with an incrementing actionIndex', () => {
      sentryContextService.trackAction('tap_enroll_button');
      sentryContextService.trackAction('tap_pay_button');

      const calls = mockSentry.addBreadcrumb.mock.calls;
      const first = calls[0][0];
      const second = calls[1][0];

      expect(first.data?.actionIndex).toBe(1);
      expect(second.data?.actionIndex).toBe(2);
    });

    it('attaches the current screen name to the breadcrumb data', () => {
      sentryContextService.trackScreen('CheckoutScreen');
      jest.clearAllMocks();
      sentryContextService.trackAction('tap_confirm');

      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ screen: 'CheckoutScreen' }),
        }),
      );
    });

    it('merges caller-supplied data into the breadcrumb', () => {
      sentryContextService.trackAction('form_submit', { formId: 'register' });

      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ formId: 'register' }),
        }),
      );
    });
  });

  describe('trackNetworkRequest', () => {
    it('adds a network breadcrumb at info level for 2xx responses', () => {
      sentryContextService.trackNetworkRequest('GET', '/api/courses', 200, 120);

      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'network',
          level: 'info',
          data: expect.objectContaining({ statusCode: 200, durationMs: 120 }),
        }),
      );
    });

    it('adds a network breadcrumb at warning level for 4xx/5xx responses', () => {
      sentryContextService.trackNetworkRequest('POST', '/api/login', 401);

      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({ level: 'warning' }),
      );
    });
  });

  // ── Custom Data Attachment ───────────────────────────────────────────────

  describe('buildCaptureContext', () => {
    it('always includes screen.current tag and session context', () => {
      sentryContextService.trackScreen('ProfileScreen');
      const ctx = sentryContextService.buildCaptureContext({});

      expect(ctx.tags?.['screen.current']).toBe('ProfileScreen');
      expect(ctx.contexts?.['session']).toBeDefined();
      expect((ctx.contexts?.['session'] as any).screen).toBe('ProfileScreen');
    });

    it('merges caller tags with automatic tags', () => {
      const ctx = sentryContextService.buildCaptureContext({
        tags: { payment_provider: 'stripe' },
      });

      expect(ctx.tags?.['payment_provider']).toBe('stripe');
      expect(ctx.tags?.['screen.current']).toBeDefined();
    });

    it('attaches fingerprint when provided', () => {
      const ctx = sentryContextService.buildCaptureContext({
        fingerprint: ['payment-failure', '{{ default }}'],
      });

      expect((ctx as any).fingerprint).toEqual(['payment-failure', '{{ default }}']);
    });

    it('includes sessionDurationMs and actionCount in extra', () => {
      const ctx = sentryContextService.buildCaptureContext({});

      expect(typeof ctx.extra?.['sessionDurationMs']).toBe('number');
      expect(typeof ctx.extra?.['actionCount']).toBe('number');
    });
  });

  // ── captureException ─────────────────────────────────────────────────────

  describe('captureException', () => {
    it('delegates to Sentry.captureException and returns the event id', () => {
      const error = new Error('Test error');
      const eventId = sentryContextService.captureException(error);

      expect(mockSentry.captureException).toHaveBeenCalledWith(error, expect.any(Object));
      expect(eventId).toBe('mock-event-id');
    });

    it('attaches error.screen and error.action tags when supplied', () => {
      const error = new Error('Payment failed');
      sentryContextService.captureException(error, {}, 'CheckoutScreen', 'tap_pay');

      const captureContext = mockSentry.captureException.mock.calls[0][1] as any;
      expect(captureContext.tags?.['error.screen']).toBe('CheckoutScreen');
      expect(captureContext.tags?.['error.action']).toBe('tap_pay');
    });

    it('merges caller-supplied extra data into the context', () => {
      const error = new Error('API timeout');
      sentryContextService.captureException(error, {
        extra: { endpoint: '/api/quiz', retries: 3 },
      });

      const captureContext = mockSentry.captureException.mock.calls[0][1] as any;
      expect(captureContext.extra?.endpoint).toBe('/api/quiz');
      expect(captureContext.extra?.retries).toBe(3);
    });
  });

  // ── captureMessage ───────────────────────────────────────────────────────

  describe('captureMessage', () => {
    it('delegates to Sentry.captureMessage with the correct level', () => {
      sentryContextService.captureMessage('Rate limit exceeded', 'warning');

      expect(mockSentry.captureMessage).toHaveBeenCalledWith(
        'Rate limit exceeded',
        expect.objectContaining({ level: 'warning' }),
      );
    });
  });

  // ── App Lifecycle ────────────────────────────────────────────────────────

  describe('trackAppLifecycle', () => {
    it('records a breadcrumb for "launch"', () => {
      sentryContextService.trackAppLifecycle('launch');

      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'app.lifecycle', message: 'App launch' }),
      );
    });

    it('records a breadcrumb for "foreground" at info level', () => {
      sentryContextService.trackAppLifecycle('foreground');

      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({ level: 'info' }),
      );
    });

    it('records a breadcrumb for "background" at info level', () => {
      sentryContextService.trackAppLifecycle('background');

      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'App background', level: 'info' }),
      );
    });

    it('records a breadcrumb for "crash" at fatal level', () => {
      sentryContextService.trackAppLifecycle('crash');

      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({ level: 'fatal' }),
      );
    });
  });

  // ── Session Reset ────────────────────────────────────────────────────────

  describe('resetSession', () => {
    it('clears Sentry breadcrumbs', () => {
      sentryContextService.resetSession();

      expect(mockSentry.clearBreadcrumbs).toHaveBeenCalled();
    });

    it('resets getCurrentScreen() to null', () => {
      sentryContextService.trackScreen('SomeScreen');
      sentryContextService.resetSession();

      expect(sentryContextService.getCurrentScreen()).toBeNull();
    });

    it('resets the action counter so the next trackAction starts at 1', () => {
      sentryContextService.trackAction('first');
      sentryContextService.trackAction('second');
      sentryContextService.resetSession();
      jest.clearAllMocks();

      sentryContextService.trackAction('after_reset');

      const call = mockSentry.addBreadcrumb.mock.calls[0][0];
      expect(call.data?.actionIndex).toBe(1);
    });
  });
});
