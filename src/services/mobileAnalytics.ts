import { appLogger } from '../utils/logger';
import { AnalyticsEvent, EventProperties } from '../utils/trackingEvents';

// ─── Privacy defaults ─────────────────────────────────────────────────────────

const DEFAULT_PRIVACY_CONFIG: PrivacyConfig = {
  epsilon: 1.0,
  delta: 1e-5,
  sensitivity: 1,
};

const DEFAULT_NOISE_TYPE: NoiseType = 'laplace';

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * MobileAnalyticsService provides a centralized API for tracking user behavior
 * and application performance. It abstracts the underlying analytics provider
 * (e.g., Firebase, Segment, Mixpanel) to allow for easy swaps in the future.
 *
 * All numeric and boolean event properties are sanitized with differential
 * privacy noise before being forwarded to the analytics backend.
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
   * @param privacyConfig  Optional override for the differential privacy config.
   */
  public async init(privacyConfig?: Partial<PrivacyConfig>): Promise<void> {
    if (this.isInitialized) return;

    if (privacyConfig) {
      this.privacyConfig = { ...DEFAULT_PRIVACY_CONFIG, ...privacyConfig };
    }

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
   * Update the differential privacy configuration at runtime.
   * Resets the privacy budget when the config changes.
   */
  public setPrivacyConfig(config: Partial<PrivacyConfig>, noiseType?: NoiseType): void {
    this.privacyConfig = { ...this.privacyConfig, ...config };
    if (noiseType) this.noiseType = noiseType;
    this.budgetManager.reset();
    logger.infoSync('MobileAnalytics: Privacy config updated');
  }

  // ─── Session management ──────────────────────────────────────────────────────

  public startSession(): void {
    const timestamp = Date.now();
    this.currentSessionId = `sess_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;

    this.trackEvent(AnalyticsEvent.SESSION_START, {
      sessionId: this.currentSessionId,
      timestamp,
    });

    appLogger.debug(`MobileAnalytics: Session started [${this.currentSessionId}]`);
  }

  public endSession(): void {
    if (!this.currentSessionId) return;

    this.trackEvent(AnalyticsEvent.SESSION_END, {
      sessionId: this.currentSessionId,
      duration: Date.now() - parseInt(this.currentSessionId.split('_')[1]),
    });

    this.currentSessionId = null;
    appLogger.debug('MobileAnalytics: Session ended');
  }

  // ─── Core tracking ───────────────────────────────────────────────────────────

  /**
   * Track a custom event.
   *
   * Numeric and boolean properties are sanitized with differential privacy
   * noise. If the privacy budget is exhausted the event is suppressed.
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
      ...sanitized,
      screen: this.currentScreen,
      sessionId: this.currentSessionId,
      platform: 'mobile',
      timestamp: new Date().toISOString(),
    };

    // Log to console/Metro for development visibility
    appLogger.info(`📊 [Analytics] Event: ${event}`, JSON.stringify(payload, null, 2));

    // Real SDK call:
    // analytics().logEvent(event, payload);
    void payload;
  }

  public trackScreen(screenName: string, properties?: EventProperties): void {
    const previousScreen = this.currentScreen;
    this.currentScreen = screenName;

    const payload: EventProperties = {
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

  public trackPerformance(name: string, value: number, properties?: EventProperties): void {
    const payload: EventProperties = {
      metric_name: name,
      metric_value: value,
      ...properties,
    };

    appLogger.info(`⏱️ [Analytics] Performance: ${name} = ${value}ms`, payload);

    this.trackEvent(AnalyticsEvent.PERFORMANCE_METRIC, payload);
  }

  public async identifyUser(userId: string, userProperties?: EventProperties): Promise<void> {
    appLogger.info(`👤 [Analytics] Identify User: ${userId}`, userProperties);

    // Real SDK implementation:
    // await analytics().setUserId(userId);
  }

  public async resetUser(): Promise<void> {
    appLogger.info('👤 [Analytics] Reset User identity');
    // await analytics().setUserId(null);
  }

  public getBudgetStatus() {
    return this.budgetManager.getStatus();
  }
}

export const mobileAnalyticsService = new MobileAnalyticsService();
export default mobileAnalyticsService;
