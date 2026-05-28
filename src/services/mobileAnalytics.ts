import { appLogger } from '../utils/logger';
import { AnalyticsEvent, EventProperties } from '../utils/trackingEvents';

/**
 * MobileAnalyticsService provides a centralized API for tracking user behavior
 * and application performance. It abstracts the underlying analytics provider
 * (e.g., Firebase, Segment, Mixpanel) to allow for easy swaps in the future.
 */
class MobileAnalyticsService {
  private isInitialized: boolean = false;
  private currentSessionId: string | null = null;
  private currentScreen: string | null = null;

  // Critical events that must always be sent (100% volume)
  private readonly CRITICAL_EVENTS: Set<AnalyticsEvent> = new Set([
    AnalyticsEvent.APP_LAUNCH,
    AnalyticsEvent.SESSION_START,
    AnalyticsEvent.SESSION_END,
    AnalyticsEvent.AUTH_LOGIN,
    AnalyticsEvent.AUTH_LOGOUT,
    AnalyticsEvent.COURSE_STARTED,
    AnalyticsEvent.COURSE_COMPLETED,
    AnalyticsEvent.QUIZ_STARTED,
    AnalyticsEvent.QUIZ_COMPLETED,
    AnalyticsEvent.API_ERROR,
    AnalyticsEvent.CRASH_REPORT,
  ]);

  /**
   * Initialize the analytics SDK.
   * This is where you would call Firebase.initializeApp() or similar.
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // In a real implementation:
      // await analytics().setAnalyticsCollectionEnabled(true);

      this.isInitialized = true;
      this.startSession();
      appLogger.info('MobileAnalytics: Initialized successfully');
    } catch (error) {
      appLogger.error('MobileAnalytics: Failed to initialize', error);
    }
  }

  /**
   * Start a new tracking session.
   */
  public startSession(): void {
    const timestamp = Date.now();
    this.currentSessionId = `sess_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;

    this.trackEvent(AnalyticsEvent.SESSION_START, {
      sessionId: this.currentSessionId,
      timestamp,
    });

    appLogger.debug(`MobileAnalytics: Session started [${this.currentSessionId}]`);
  }

  /**
   * End the current tracking session.
   */
  public endSession(): void {
    if (!this.currentSessionId) return;

    this.trackEvent(AnalyticsEvent.SESSION_END, {
      sessionId: this.currentSessionId,
      duration: Date.now() - parseInt(this.currentSessionId.split('_')[1]),
    });

    this.currentSessionId = null;
    appLogger.debug('MobileAnalytics: Session ended');
  }

  /**
   * Track a custom event.
   * @param event The event name from the AnalyticsEvent enum.
   * @param properties Optional metadata to attach to the event.
   */
  public trackEvent(event: AnalyticsEvent, properties?: EventProperties): void {
    // Implement sampling for non-critical events (10% rate)
    if (!this.CRITICAL_EVENTS.has(event)) {
      if (Math.random() > 0.1) {
        appLogger.debug(`📊 [Analytics] Event: ${event} skipped due to sampling`);
        return;
      }
    }

    const payload = {
      ...properties,
      screen: this.currentScreen,
      sessionId: this.currentSessionId,
      platform: 'mobile',
      timestamp: new Date().toISOString(),
    };

    // Log to console/Metro for development visibility
    appLogger.info(`📊 [Analytics] Event: ${event}`, JSON.stringify(payload, null, 2));

    // Here you would call the real SDK:
    // analytics().logEvent(event, payload);
  }

  /**
   * Track a screen view transition.
   * @param screenName The name of the screen being viewed.
   * @param properties Optional metadata about the screen.
   */
  public trackScreen(screenName: string, properties?: EventProperties): void {
    const previousScreen = this.currentScreen;
    this.currentScreen = screenName;

    const payload = {
      ...properties,
      previous_screen: previousScreen,
      timestamp: new Date().toISOString(),
    };

    appLogger.info(`📱 [Analytics] Screen View: ${screenName}`, payload);

    // Real SDK implementation:
    // analytics().logScreenView({
    //   screen_name: screenName,
    //   screen_class: screenName,
    // });

    // Also track as a generic event for providers that don't have logScreenView
    this.trackEvent(AnalyticsEvent.SCREEN_VIEW, {
      screen: screenName,
      ...payload,
    });
  }

  /**
   * Log performance metrics.
   * @param name The metric name.
   * @param value The value (usually in milliseconds).
   */
  public trackPerformance(name: string, value: number, properties?: EventProperties): void {
    const payload = {
      metric_name: name,
      metric_value: value,
      ...properties,
    };

    appLogger.info(`⏱️ [Analytics] Performance: ${name} = ${value}ms`, payload);

    this.trackEvent(AnalyticsEvent.PERFORMANCE_METRIC, payload);
  }

  /**
   * Set user identity for tracking across sessions.
   * @param userId The unique user ID from the backend.
   * @param userProperties Key-value pairs of user traits.
   */
  public async identifyUser(userId: string, userProperties?: EventProperties): Promise<void> {
    appLogger.info(`👤 [Analytics] Identify User: ${userId}`, userProperties);

    // Real SDK implementation:
    // await analytics().setUserId(userId);
    // if (userProperties) await analytics().setUserProperties(userProperties);
  }

  /**
   * Clear user identity (on logout).
   */
  public async resetUser(): Promise<void> {
    appLogger.info('👤 [Analytics] Reset User identity');
    // await analytics().setUserId(null);
  }
}

// Export a singleton instance
export const mobileAnalyticsService = new MobileAnalyticsService();
export default mobileAnalyticsService;
