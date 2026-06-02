/**
 * SentryContextService — Automatic production error reporting with context
 *
 * Implements all acceptance criteria for enhanced Sentry integration:
 *  ✅ Sentry breadcrumbs (navigation, user actions, network)
 *  ✅ Capture user and action context via Sentry scope
 *  ✅ Attach custom data to errors (tags, extra, contexts)
 *  ✅ Screen tracking breadcrumbs
 *  ✅ Action/event breadcrumbs
 */

import * as Sentry from '@sentry/react-native';

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface SentryUserContext {
  id: string;
  email?: string;
  username?: string;
  role?: string;
}

export type BreadcrumbCategory =
  | 'navigation'
  | 'user.action'
  | 'network'
  | 'auth'
  | 'app.lifecycle'
  | 'custom';

export interface ActionBreadcrumb {
  category: BreadcrumbCategory;
  message: string;
  data?: Record<string, unknown>;
  level?: Sentry.SeverityLevel;
}

export interface CustomErrorData {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  contexts?: Record<string, Record<string, unknown>>;
  fingerprint?: string[];
}

// ─── SERVICE ─────────────────────────────────────────────────────────────────

class SentryContextService {
  private currentScreen: string | null = null;
  private previousScreen: string | null = null;
  private sessionStartedAt: number = Date.now();
  private actionCount: number = 0;

  // ── User Context ────────────────────────────────────────────────────────

  /**
   * Bind Sentry scope to the signed-in user.
   * Call after successful login / session restore.
   */
  setUser(user: SentryUserContext): void {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });

    // Store role as a tag for dashboard filtering
    if (user.role) {
      Sentry.setTag('user.role', user.role);
    }

    this.addBreadcrumb({
      category: 'auth',
      message: `User signed in (id=${user.id})`,
      level: 'info',
    });
  }

  /**
   * Clear user from Sentry scope on logout.
   */
  clearUser(): void {
    Sentry.setUser(null);
    Sentry.setTag('user.role', '');

    this.addBreadcrumb({
      category: 'auth',
      message: 'User signed out',
      level: 'info',
    });
  }

  // ── Screen Tracking ─────────────────────────────────────────────────────

  /**
   * Record a screen navigation breadcrumb and update Sentry transaction name.
   */
  trackScreen(screenName: string, params?: Record<string, unknown>): void {
    this.previousScreen = this.currentScreen;
    this.currentScreen = screenName;

    Sentry.setTag('screen.current', screenName);
    if (this.previousScreen) {
      Sentry.setTag('screen.previous', this.previousScreen);
    }

    Sentry.addBreadcrumb({
      category: 'navigation',
      message: `Navigated to ${screenName}`,
      level: 'info',
      data: {
        from: this.previousScreen ?? 'app_start',
        to: screenName,
        ...(params ? { params } : {}),
      },
      timestamp: Date.now() / 1000,
    });
  }

  getCurrentScreen(): string | null {
    return this.currentScreen;
  }

  // ── Action Breadcrumbs ──────────────────────────────────────────────────

  /**
   * Record a user action breadcrumb (button presses, form submits, etc.).
   */
  trackAction(action: string, data?: Record<string, unknown>): void {
    this.actionCount++;

    Sentry.addBreadcrumb({
      category: 'user.action',
      message: action,
      level: 'info',
      data: {
        actionIndex: this.actionCount,
        screen: this.currentScreen ?? 'unknown',
        ...data,
      },
      timestamp: Date.now() / 1000,
    });
  }

  /**
   * Record a network request breadcrumb.
   */
  trackNetworkRequest(method: string, url: string, statusCode?: number, durationMs?: number): void {
    const level: Sentry.SeverityLevel =
      statusCode !== undefined && statusCode >= 400 ? 'warning' : 'info';

    Sentry.addBreadcrumb({
      category: 'network',
      message: `${method.toUpperCase()} ${url}`,
      level,
      data: {
        method,
        url,
        statusCode,
        durationMs,
      },
      timestamp: Date.now() / 1000,
    });
  }

  /**
   * General-purpose breadcrumb helper.
   */
  addBreadcrumb(breadcrumb: ActionBreadcrumb): void {
    Sentry.addBreadcrumb({
      category: breadcrumb.category,
      message: breadcrumb.message,
      level: breadcrumb.level ?? 'info',
      data: {
        screen: this.currentScreen ?? 'unknown',
        ...breadcrumb.data,
      },
      timestamp: Date.now() / 1000,
    });
  }

  // ── Custom Data Attachment ───────────────────────────────────────────────

  /**
   * Attach structured custom data to a Sentry error event.
   * Pass this as the second argument to captureException.
   */
  buildCaptureContext(customData: CustomErrorData): Sentry.ScopeContext {
    return {
      tags: {
        'screen.current': this.currentScreen ?? 'unknown',
        ...customData.tags,
      },
      extra: {
        sessionDurationMs: Date.now() - this.sessionStartedAt,
        actionCount: this.actionCount,
        ...customData.extra,
      },
      contexts: {
        session: {
          screen: this.currentScreen,
          previousScreen: this.previousScreen,
          sessionStartedAt: new Date(this.sessionStartedAt).toISOString(),
          actionCount: this.actionCount,
        },
        ...customData.contexts,
      },
      ...(customData.fingerprint ? { fingerprint: customData.fingerprint } : {}),
    } as Sentry.ScopeContext;
  }

  /**
   * Capture an exception with full session context automatically attached.
   */
  captureException(
    error: unknown,
    customData?: CustomErrorData,
    screen?: string,
    action?: string,
  ): string {
    const captureContext = this.buildCaptureContext({
      tags: {
        ...(screen ? { 'error.screen': screen } : {}),
        ...(action ? { 'error.action': action } : {}),
        ...customData?.tags,
      },
      extra: customData?.extra,
      contexts: customData?.contexts,
      fingerprint: customData?.fingerprint,
    });

    return Sentry.captureException(error, captureContext);
  }

  /**
   * Capture a message (non-exception) with session context.
   */
  captureMessage(
    message: string,
    level: Sentry.SeverityLevel = 'info',
    customData?: CustomErrorData,
  ): string {
    return Sentry.captureMessage(message, {
      level,
      ...this.buildCaptureContext(customData ?? {}),
    });
  }

  // ── Session / Lifecycle ─────────────────────────────────────────────────

  /**
   * Record an app lifecycle event breadcrumb.
   */
  trackAppLifecycle(event: 'foreground' | 'background' | 'launch' | 'crash'): void {
    this.addBreadcrumb({
      category: 'app.lifecycle',
      message: `App ${event}`,
      level: event === 'crash' ? 'fatal' : 'info',
      data: { event, sessionDurationMs: Date.now() - this.sessionStartedAt },
    });
  }

  /**
   * Reset session counters (e.g. after logout).
   */
  resetSession(): void {
    this.sessionStartedAt = Date.now();
    this.actionCount = 0;
    this.previousScreen = null;
    this.currentScreen = null;
    Sentry.clearBreadcrumbs();
  }
}

// ─── SINGLETON ────────────────────────────────────────────────────────────────

export const sentryContextService = new SentryContextService();
export default sentryContextService;
