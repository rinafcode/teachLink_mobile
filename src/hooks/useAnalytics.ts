import { useCallback } from 'react';

import { useAnalyticsContext } from '../components/mobile/AnalyticsProvider';
import { DPConfig } from '../utils/differentialPrivacy';
import { AnalyticsEvent, EventProperties, PerformanceMetric } from '../utils/trackingEvents';

/**
 * Custom hook to access analytics tracking capabilities from functional components.
 * All events are automatically privatized via differential privacy before dispatch.
 *
 * @example
 * const { trackEvent, trackScreen, setPrivacyBudget } = useAnalytics();
 * trackEvent(AnalyticsEvent.UI_CLICK, { button: 'search' });
 * setPrivacyBudget({ epsilon: 0.5 }); // tighter privacy
 */
export const useAnalytics = () => {
  const { service } = useAnalyticsContext();

  /** Record a custom user interaction or system event. */
  const trackEvent = useCallback(
    (event: AnalyticsEvent, properties?: EventProperties) => {
      service.trackEvent(event, properties);
    },
    [service]
  );

  /** Record a navigation transition. */
  const trackScreen = useCallback(
    (screenName: string, properties?: EventProperties) => {
      service.trackScreen(screenName, properties);
    },
    [service]
  );

  /** Record a performance metric (e.g., component render time or API response). */
  const trackTiming = useCallback(
    (metric: PerformanceMetric | string, value: number, properties?: EventProperties) => {
      service.trackPerformance(metric, value, properties);
    },
    [service]
  );

  /** Identify the user for future events. */
  const identify = useCallback(
    (userId: string, properties?: EventProperties) => {
      service.identifyUser(userId, properties);
    },
    [service]
  );

  /** Track button clicks. */
  const trackButtonClick = useCallback(
    (buttonName: string, properties?: EventProperties) => {
      service.trackEvent(AnalyticsEvent.UI_CLICK, { button: buttonName, ...properties });
    },
    [service]
  );

  /** Track form submissions. */
  const trackFormSubmit = useCallback(
    (formName: string, properties?: EventProperties) => {
      service.trackEvent(AnalyticsEvent.FORM_SUBMIT, { form: formName, ...properties });
    },
    [service]
  );

  /** Track errors. */
  const trackError = useCallback(
    (error: Error | string, isFatal: boolean = false, properties?: EventProperties) => {
      const errorMessage = error instanceof Error ? error.message : error;
      service.trackEvent(isFatal ? AnalyticsEvent.CRASH_REPORT : AnalyticsEvent.API_ERROR, {
        error: errorMessage,
        isFatal,
        ...properties,
      });
    },
    [service]
  );

  // ─── Privacy Controls ─────────────────────────────────────────────────────

  /**
   * Adjust the differential privacy budget (ε).
   * Lower epsilon = stronger privacy guarantee, more noise added.
   * Recommended range: 0.1 (very private) to 10.0 (low privacy).
   *
   * @example
   * setPrivacyBudget({ epsilon: 0.5 }); // stricter privacy
   */
  const setPrivacyBudget = useCallback(
    (config: Partial<DPConfig>) => {
      service.configureDifferentialPrivacy(config);
    },
    [service]
  );

  /**
   * Enable or disable differential privacy noise injection.
   * Useful for debugging; should always be enabled in production.
   */
  const setPrivacyEnabled = useCallback(
    (enabled: boolean) => {
      service.configureDifferentialPrivacy({ enabled });
    },
    [service]
  );

  /**
   * Read the current differential privacy configuration.
   */
  const getPrivacyConfig = useCallback((): Readonly<DPConfig> => {
    return service.getDPConfig();
  }, [service]);

  return {
    trackEvent,
    trackScreen,
    trackTiming,
    identify,
    trackButtonClick,
    trackFormSubmit,
    trackError,
    // Privacy controls
    setPrivacyBudget,
    setPrivacyEnabled,
    getPrivacyConfig,
    service, // Direct access if needed
  };
};

export default useAnalytics;
