import { NoiseType, PrivacyConfig, sanitizeEventProperties } from '../utils/differentialPrivacy';
import { appLogger as logger } from '../utils/logger';
import { PrivacyBudgetManager } from '../utils/privacyBudgetManager';
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

  private privacyConfig: PrivacyConfig = DEFAULT_PRIVACY_CONFIG;
  private noiseType: NoiseType = DEFAULT_NOISE_TYPE;
  private budgetManager: PrivacyBudgetManager = new PrivacyBudgetManager(10);

  // ─── Initialisation ─────────────────────────────────────────────────────────

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
      logger.infoSync('MobileAnalytics: Initialized successfully');
    } catch (error) {
      logger.errorSync('MobileAnalytics: Failed to initialize', error as Error);
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
    this.budgetManager.reset();

    this.trackEvent(AnalyticsEvent.SESSION_START, {
      sessionId: this.currentSessionId,
      timestamp,
    });

    logger.infoSync(`MobileAnalytics: Session started [${this.currentSessionId}]`);
  }

  public endSession(): void {
    if (!this.currentSessionId) return;

    this.trackEvent(AnalyticsEvent.SESSION_END, {
      sessionId: this.currentSessionId,
      duration: Date.now() - parseInt(this.currentSessionId.split('_')[1]),
    });

    this.currentSessionId = null;
    logger.infoSync('MobileAnalytics: Session ended');
  }

  // ─── Core tracking ───────────────────────────────────────────────────────────

  /**
   * Track a custom event.
   *
   * Numeric and boolean properties are sanitized with differential privacy
   * noise. If the privacy budget is exhausted the event is suppressed.
   */
  public trackEvent(event: AnalyticsEvent, properties?: EventProperties): void {
    if (!this.budgetManager.consume(this.privacyConfig.epsilon)) {
      logger.infoSync(`MobileAnalytics: event suppressed (budget exhausted) [${event}]`);
      return;
    }

    const sanitized = properties
      ? sanitizeEventProperties(properties, this.privacyConfig, this.noiseType)
      : {};

    const payload = {
      ...sanitized,
      screen: this.currentScreen,
      sessionId: this.currentSessionId,
      platform: 'mobile',
      timestamp: new Date().toISOString(),
    };

    logger.infoSync(`📊 [Analytics] Event: ${event}`);

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

    logger.infoSync(`📱 [Analytics] Screen View: ${screenName}`);

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

    logger.infoSync(`⏱️ [Analytics] Performance: ${name} = ${value}ms`);

    this.trackEvent(AnalyticsEvent.PERFORMANCE_METRIC, payload);
  }

  public async identifyUser(userId: string, userProperties?: EventProperties): Promise<void> {
    logger.infoSync(`👤 [Analytics] Identify User: ${userId}`);
    void userProperties;
    // await analytics().setUserId(userId);
  }

  public async resetUser(): Promise<void> {
    logger.infoSync('👤 [Analytics] Reset User identity');
    // await analytics().setUserId(null);
  }

  public getBudgetStatus() {
    return this.budgetManager.getStatus();
  }
}

export const mobileAnalyticsService = new MobileAnalyticsService();
export default mobileAnalyticsService;
