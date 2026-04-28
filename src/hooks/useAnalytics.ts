import { useCallback } from 'react';
import { useAnalyticsContext } from '../components/mobile/AnalyticsProvider';
import { AnalyticsEvent, EventProperties, PerformanceMetric } from '../utils/trackingEvents';

/**
 * Custom hook to access analytics tracking capabilities from functional components.
 * 
 * @example
 * const { trackEvent, trackScreen } = useAnalytics();
 * trackEvent(AnalyticsEvent.UI_CLICK, { button: 'search' });
 */
export const useAnalytics = () => {
  const { service } = useAnalyticsContext();

  /**
   * Record a custom user interaction or system event.
   */
  const trackEvent = useCallback(
    (event: AnalyticsEvent, properties?: EventProperties) => {
      service.trackEvent(event, properties);
    },
    [service]
  );

  /**
   * Record a navigation transition.
   */
  const trackScreen = useCallback(
    (screenName: string, properties?: EventProperties) => {
      service.trackScreen(screenName, properties);
    },
    [service]
  );

  /**
   * Record a performance metric (e.g., component render time or API response).
   */
  const trackTiming = useCallback(
    (metric: PerformanceMetric | string, value: number, properties?: EventProperties) => {
      service.trackPerformance(metric, value, properties);
    },
    [service]
  );

  /**
   * Identify the user for future events.
   */
  const identify = useCallback(
    (userId: string, properties?: EventProperties) => {
      service.identifyUser(userId, properties);
    },
    [service]
  );

  /**
   * Track button clicks
   */
  const trackButtonClick = useCallback(
    (buttonName: string, properties?: EventProperties) => {
      service.trackEvent(AnalyticsEvent.UI_CLICK, { button: buttonName, ...properties });
    },
    [service]
  );

  /**
   * Track form submissions
   */
  const trackFormSubmit = useCallback(
    (formName: string, properties?: EventProperties) => {
      service.trackEvent(AnalyticsEvent.FORM_SUBMIT, { form: formName, ...properties });
    },
    [service]
  );

  /**
   * Track errors
   */
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

  return {
    trackEvent,
    trackScreen,
    trackTiming,
    identify,
    trackButtonClick,
    trackFormSubmit,
    trackError,
    service, // Direct access if needed
  };
};

export default useAnalytics;
