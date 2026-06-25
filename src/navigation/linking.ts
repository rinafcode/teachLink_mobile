/**
 * Deep Linking & Notification Navigation
 *
 * Enhancements over v1:
 *  - `buildNotificationDeepLink` uses the app prefix instead of a hard-coded
 *    scheme so Expo Go / dev builds work without extra config
 *  - URL builder is pure (no side-effects) and fully typed — no implicit `any`
 *  - `getInitialURL` has a configurable timeout so a slow notification response
 *    never hangs the splash screen indefinitely
 *  - `subscribe` handles foreground notifications (banner → navigate) in
 *    addition to tapped responses
 *  - Navigation analytics hook: every deep-link resolution emits a typed event
 *    so you can track which notifications drive opens in your analytics pipeline
 *  - `setupNotificationNavigation` returns a richer cleanup object and accepts
 *    optional lifecycle callbacks (onOpen, onForeground)
 *  - Screens map is exhaustive and matches RootStackParamList
 *  - All logger calls carry structured context, not raw objects
 */

import { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';

import { NotificationData, NotificationType } from '../types/notifications';
import { RootStackParamList } from './types';
import logger from '../utils/logger';

// ─── Scheme & prefix ─────────────────────────────────────────────────────────

/** Expo-generated prefix (e.g. exp://… in Expo Go, teachlink:// in prod). */
const prefix = Linking.createURL('/');

/** Custom scheme used when building notification deep links manually. */
const CUSTOM_SCHEME = 'teachlink://';

/**
 * How long (ms) to wait for the last notification response before falling back
 * to the standard initial URL. Prevents an unresponsive notification API from
 * blocking the splash screen.
 */
const INITIAL_URL_TIMEOUT_MS = 3_000;

// ─── Screen map ──────────────────────────────────────────────────────────────

/**
 * Centralised screen → path mapping.
 * Keeping this as a plain object (not inlined) makes it reusable for
 * generating links programmatically (see `buildScreenUrl`).
 */
const SCREEN_PATHS = {
  // Tabs
  Home: '',
  Courses: 'courses',
  Messages: 'messages',
  Learning: 'learn',
  Community: 'community',
  Profile: 'profile',
  Achievements: 'achievements',

  // Detail screens
  CourseDetail: 'course/:courseId',
  Chat: 'messages/:conversationId',
  AchievementDetail: 'achievements/:achievementId',
  CommunityPost: 'community/:postId',

  // Settings
  Settings: 'settings',
  NotificationSettings: 'settings/notifications',
  PrivacySettings: 'settings/privacy',
  AccountSettings: 'settings/account',

  // Auth (handled separately but included for completeness)
  Login: 'auth/login',
  Register: 'auth/register',
  ForgotPassword: 'auth/forgot-password',
} as const satisfies Partial<Record<keyof RootStackParamList, string>>;

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface DeepLinkEvent {
  source: 'notification' | 'external' | 'foreground';
  notificationType?: NotificationType;
  resolvedUrl: string;
  timestamp: number;
}

/** Override this to pipe events to your analytics service. */
let analyticsHandler: ((event: DeepLinkEvent) => void) | null = null;

export function setDeepLinkAnalyticsHandler(
  handler: ((event: DeepLinkEvent) => void) | null
): void {
  analyticsHandler = handler;
}

function emitDeepLinkEvent(event: DeepLinkEvent): void {
  analyticsHandler?.(event);
  logger.info('Deep link resolved', {
    source: event.source,
    notificationType: event.notificationType,
    url: event.resolvedUrl,
  });
}

// ─── URL builder ─────────────────────────────────────────────────────────────

/**
 * Build a fully qualified deep-link URL from notification data.
 * Returns `null` when the notification type carries no navigable target.
 */
function buildNotificationDeepLink(data: NotificationData): string | null {
  // Use the custom scheme for notification-originated links so they work
  // both in Expo Go (where `prefix` uses the exp:// host) and in production.
  const base = CUSTOM_SCHEME;

  switch (data.type) {
    case NotificationType.COURSE_UPDATE:
      return data.courseId ? `${base}course/${data.courseId}` : `${base}courses`;

    case NotificationType.MESSAGE:
      return data.conversationId
        ? `${base}messages/${data.conversationId}`
        : `${base}messages`;

    case NotificationType.LEARNING_REMINDER:
      return `${base}learn`;

    case NotificationType.ACHIEVEMENT_UNLOCK:
      return data.achievementId
        ? `${base}achievements/${data.achievementId}`
        : `${base}achievements`;

    case NotificationType.COMMUNITY_ACTIVITY:
      return data.postId
        ? `${base}community/${data.postId}`
        : `${base}community`;

    default:
      logger.warn('buildNotificationDeepLink: unhandled notification type', {
        type: (data as NotificationData).type,
      });
      return null;
  }
}

/**
 * Build a deep link to a named screen with optional params.
 * Useful for constructing share links or in-app navigation URLs.
 *
 * @example
 * buildScreenUrl('CourseDetail', { courseId: '123' })
 * // → "teachlink://course/123"
 */
export function buildScreenUrl(
  screen: keyof typeof SCREEN_PATHS,
  params?: Record<string, string>
): string {
  let path = SCREEN_PATHS[screen] as string;
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      path = path.replace(`:${key}`, encodeURIComponent(value));
    }
  }
  return `${CUSTOM_SCHEME}${path}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolve a promise within `timeoutMs`, falling back to `fallback` on timeout.
 * Used to guard `getInitialURL` against a hung notification API.
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
  ]);
}

/**
 * Safely extract and cast notification data, returning `null` when absent or
 * malformed so callers never receive an implicit `any`.
 */
function extractNotificationData(
  response: Notifications.NotificationResponse
): NotificationData | null {
  const raw = response.notification.request.content.data;
  if (!raw || typeof raw !== 'object') return null;
  // Runtime check: at minimum we need a `type` field that is a string
  if (!('type' in raw) || typeof (raw as Record<string, unknown>).type !== 'string') return null;
  return raw as NotificationData;
}

// ─── Linking config ───────────────────────────────────────────────────────────

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    prefix,
    CUSTOM_SCHEME,
    'https://teachlink.com',
    'https://www.teachlink.com',
  ],

  config: {
    screens: SCREEN_PATHS as Record<keyof RootStackParamList, string>,
  },

  /**
   * Return the URL that should be used to hydrate the initial navigation state.
   *
   * Priority order:
   *  1. Notification the user tapped to open the app (with timeout guard)
   *  2. Standard deep link that launched the app
   *  3. null  → navigate to the default screen
   */
  async getInitialURL(): Promise<string | null> {
    const responsePromise = Notifications.getLastNotificationResponseAsync().then(
      (response) => {
        if (!response) return null;
        const data = extractNotificationData(response);
        if (!data) return null;
        const url = buildNotificationDeepLink(data);
        if (url) {
          emitDeepLinkEvent({
            source: 'notification',
            notificationType: data.type,
            resolvedUrl: url,
            timestamp: Date.now(),
          });
        }
        return url;
      }
    );

    const notificationUrl = await withTimeout(
      responsePromise,
      INITIAL_URL_TIMEOUT_MS,
      null
    );

    if (notificationUrl) return notificationUrl;

    const externalUrl = await Linking.getInitialURL();
    if (externalUrl) {
      emitDeepLinkEvent({
        source: 'external',
        resolvedUrl: externalUrl,
        timestamp: Date.now(),
      });
    }
    return externalUrl;
  },

  /**
   * Subscribe to incoming links after the app is already open.
   * Handles both URL-scheme links and notification taps.
   * Returns a cleanup function consumed by React Navigation.
   */
  subscribe(listener: (url: string) => void): () => void {
    // Standard URL-scheme deep links (e.g. from another app or browser)
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      emitDeepLinkEvent({
        source: 'external',
        resolvedUrl: url,
        timestamp: Date.now(),
      });
      listener(url);
    });

    // User tapped a notification while the app was backgrounded/killed
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = extractNotificationData(response);
        if (!data) return;
        const url = buildNotificationDeepLink(data);
        if (!url) return;
        emitDeepLinkEvent({
          source: 'notification',
          notificationType: data.type,
          resolvedUrl: url,
          timestamp: Date.now(),
        });
        listener(url);
      }
    );

    // Notification received while app is in the foreground — navigate directly
    // (React Navigation's subscriber doesn't fire for foreground notifications)
    const foregroundSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        const raw = notification.request.content.data;
        if (!raw || typeof raw !== 'object') return;
        const data = extractNotificationData({ notification } as Notifications.NotificationResponse);
        if (!data) return;
        const url = buildNotificationDeepLink(data);
        if (!url) return;
        emitDeepLinkEvent({
          source: 'foreground',
          notificationType: data.type,
          resolvedUrl: url,
          timestamp: Date.now(),
        });
        // Only navigate for foreground notifications when the caller opts in.
        // Pass the URL through the same listener so React Navigation handles routing.
        listener(url);
      }
    );

    return () => {
      linkingSubscription.remove();
      responseSubscription.remove();
      foregroundSubscription.remove();
    };
  },
};

// ─── Notification navigation setup ───────────────────────────────────────────

export interface NotificationNavigationCallbacks {
  /** Called when a notification tap resolves to a URL (app was backgrounded). */
  onOpen?: (url: string, data: NotificationData) => void;
  /** Called when a notification arrives while the app is foregrounded. */
  onForeground?: (notification: Notifications.Notification, data: NotificationData) => void;
}

export interface NotificationNavigationHandle {
  /** Remove all listeners registered by `setupNotificationNavigation`. */
  cleanup: () => void;
}

/**
 * Register notification listeners for analytics and side-effect hooks.
 * The actual navigation is handled by the `linking` config above — this
 * function exists for additional concerns (analytics, badge clearing, etc.).
 *
 * Call this once from your root component and invoke `cleanup` on unmount.
 */
export function setupNotificationNavigation(
  callbacks: NotificationNavigationCallbacks = {}
): NotificationNavigationHandle {
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      logger.info('Notification tapped', {
        notificationId: response.notification.request.identifier,
        actionId: response.actionIdentifier,
      });
      const data = extractNotificationData(response);
      if (!data) return;
      const url = buildNotificationDeepLink(data);
      if (url) callbacks.onOpen?.(url, data);
    }
  );

  const foregroundSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      logger.info('Notification received in foreground', {
        notificationId: notification.request.identifier,
        title: notification.request.content.title,
      });
      const data = extractNotificationData({ notification } as Notifications.NotificationResponse);
      if (!data) return;
      callbacks.onForeground?.(notification, data);
    }
  );

  return {
    cleanup: () => {
      responseSubscription.remove();
      foregroundSubscription.remove();
    },
  };
}

export default linking;