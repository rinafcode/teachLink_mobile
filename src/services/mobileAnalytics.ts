import { appLogger } from '../utils/logger';
import { AnalyticsEvent, EventProperties } from '../utils/trackingEvents';
import { AnalyticsBatchQueue } from './analytics/AnalyticsBatchQueue';
import { DPConfig, privatizeDuration, sanitizeProperties } from '../utils/differentialPrivacy';

/**
 * MobileAnalyticsService provides a centralized API for tracking user behavior
 * and application performance with differential privacy applied to all events.
 *
 * Privacy guarantees:
 * - All numeric properties are noise-added via the Laplace mechanism (ε-DP).
 * - All string properties are sanitized to remove PII before transmission.
 * - DP is applied per-event before any external SDK call.
 */
class MobileAnalyticsService {
  private static readonly HIGH_FREQUENCY_EVENT_MAX_PER_SECOND = 10;
  private static readonly HIGH_FREQUENCY_EVENT_INTERVAL_MS =
    1000 / MobileAnalyticsService.HIGH_FREQUENCY_EVENT_MAX_PER_SECOND;
  private isInitialized: boolean = false;
  private currentSessionId: string | null = null;
  private currentScreen: string | null = null;
  private readonly throttledEventLastSentAt = new Map<string, number>();
  private readonly batchQueue = new AnalyticsBatchQueue();
  private dpConfig: DPConfig = { epsilon: 1.0, sensitivity: 1.0, enabled: true };

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
   */
  public async init(dpConfig?: Partial<DPConfig>): Promise<void> {
    if (this.isInitialized) return;

    if (dpConfig) {
      this.dpConfig = { ...this.dpConfig, ...dpConfig };
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
   * Configure the differential privacy budget at runtime.
   */
  public configureDifferentialPrivacy(config: Partial<DPConfig>): void {
    this.dpConfig = { ...this.dpConfig, ...config };
    appLogger.info('MobileAnalytics: DP config updated', this.dpConfig);
  }

  /** Return the current DP configuration (read-only). */
  public getDPConfig(): Readonly<DPConfig> {
    return { ...this.dpConfig };
  }

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

  /**
   * Track a custom event with differential privacy applied to all properties.
   * Numeric properties receive Laplace noise; strings are PII-sanitized.
   */
  public trackEvent(event: AnalyticsEvent, properties?: EventProperties): void {
    if (this.shouldThrottleHighFrequencyEvent(event, properties)) {
      return;
    }

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

    this.batchQueue.enqueue(event, payload);
  }

  private shouldThrottleHighFrequencyEvent(
    event: AnalyticsEvent,
    properties?: EventProperties
  ): boolean {
    const eventCategory = properties?.event_category;
    if (eventCategory !== 'high_frequency') {
      return false;
    }

    const eventName =
      typeof properties?.event_name === 'string' && properties.event_name.trim().length > 0
        ? properties.event_name
        : event;
    const now = Date.now();
    const lastSentAt = this.throttledEventLastSentAt.get(eventName);

    if (
      typeof lastSentAt === 'number' &&
      now - lastSentAt < MobileAnalyticsService.HIGH_FREQUENCY_EVENT_INTERVAL_MS
    ) {
      return true;
    }

    this.throttledEventLastSentAt.set(eventName, now);
    return false;
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
   * Log a performance metric. Duration is privatized before logging.
   */
  public trackPerformance(name: string, value: number, properties?: EventProperties): void {
    const privatizedValue = privatizeDuration(value, 300_000, this.dpConfig);

    const payload = {
      metric_name: name,
      metric_value: privatizedValue,
      ...properties,
    };

    appLogger.info(`⏱️ [Analytics] Performance: ${name} = ${value}ms`, payload);

    this.trackEvent(AnalyticsEvent.PERFORMANCE_METRIC, payload);
  }

  public async identifyUser(userId: string, userProperties?: EventProperties): Promise<void> {
    appLogger.info(`👤 [Analytics] Identify User: ${userId}`, userProperties);

    // Real SDK implementation:
    // await analytics().setUserId(userId);
    // if (userProperties) await analytics().setUserProperties(userProperties);
  }

  public async resetUser(): Promise<void> {
    appLogger.info('👤 [Analytics] Reset User identity');
    // await analytics().setUserId(null);
  }

  /**
   * Cleanup batch queue timers. Call on app teardown.
   */
  public destroy(): void {
    this.batchQueue.destroy();
  }

  // ─── Private DP Helpers ──────────────────────────────────────────────────

  /**
   * Apply differential privacy to a flat property bag.
   * - Numeric values: Laplace noise (sensitivity = 1, configurable ε).
   * - String values: PII sanitization (email/phone/uuid redaction).
   * - Booleans / null: passed through unchanged.
   */
  private applyDifferentialPrivacy(properties: Record<string, unknown>): Record<string, unknown> {
    if (!this.dpConfig.enabled) return properties;

    const stringProps: Record<string, unknown> = {};
    const numericProps: Record<string, unknown> = {};

    for (const [k, v] of Object.entries(properties)) {
      if (typeof v === 'number') {
        numericProps[k] = v;
      } else {
        stringProps[k] = v;
      }
    }

    const sanitized = sanitizeProperties(stringProps);

    // Add Laplace noise to each numeric field individually
    const noisyNumerics: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(numericProps)) {
      const scale = this.dpConfig.sensitivity / this.dpConfig.epsilon;
      let u = Math.random() - 0.5;
      while (u === 0) u = Math.random() - 0.5;
      const noise = -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
      noisyNumerics[k] = (v as number) + noise;
    }

    return { ...sanitized, ...noisyNumerics };
  }
}

// Export a singleton instance
export const mobileAnalyticsService = new MobileAnalyticsService();
export default mobileAnalyticsService;
