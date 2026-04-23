import logger from "../utils/logger";
import { AnalyticsEvent } from "../utils/trackingEvents";
import { mobileAnalyticsService } from "./mobileAnalytics";

/**
 * CrashReportingService manages global error tracking and exception handling.
 * It integrates with the analytics service to record crash events.
 */
class CrashReportingService {
  private isInitialized: boolean = false;
  private unhandledErrorCount: number = 0;
  private readonly MAX_ERRORS_THRESHOLD: number = 5;

  /**
   * Initializes global error handlers for JS and native (via bridge).
   */
  public init(): void {
    if (this.isInitialized) return;

    try {
      // 1. Capture React Native JS globally (Errors that happen in JS thread)
      // Set global handler for JS errors
      // @ts-ignore - ErrorUtils is a global in React Native environment
      if (global.ErrorUtils) {
        // @ts-ignore
        const originalHandler = global.ErrorUtils.getGlobalHandler();

        // @ts-ignore
        global.ErrorUtils.setGlobalHandler(
          (error: Error, isFatal?: boolean) => {
            this.captureCrash(error, isFatal);

            // Re-throw if a handler was registered or if we want standard behavior
            if (originalHandler) {
              originalHandler(error, isFatal);
            }
          },
        );
      }

      // 2. Handle unhandled promise rejections
      // @ts-ignore
      if (global.onunhandledrejection) {
        // @ts-ignore
        const originalRejectionHandler = global.onunhandledrejection;

        // @ts-ignore
        global.onunhandledrejection = (reason: any) => {
          const error =
            reason instanceof Error ? reason : new Error(String(reason));
          this.captureCrash(error, false);

          if (originalRejectionHandler) {
            originalRejectionHandler(reason);
          }
        };
      }

      // 3. Mock native crash reporting (Real apps use Sentry, Bugsnag, or Firebase Crashlytics)
      // crashlytics().setCrashlyticsCollectionEnabled(true);

      this.isInitialized = true;
      logger.info("CrashReporting: Initialized global error handlers");
    } catch (error) {
      logger.error("CrashReporting: Failed to initialize handlers", error);
    }
  }

  /**
   * Capture a fatal or non-fatal crash.
   */
  private captureCrash(error: Error, isFatal?: boolean): void {
    this.unhandledErrorCount++;

    const errorDetails = {
      message: error.message,
      stack: error.stack,
      isFatal: !!isFatal,
      timestamp: new Date().toISOString(),
      errorCount: this.unhandledErrorCount,
    };

    // Log for development
    logger.error(
      `❌ [Crash] ${isFatal ? "FATAL" : "Non-Fatal"} Crash: ${error.message}`,
      errorDetails,
    );

    // Record as analytics event
    mobileAnalyticsService.trackEvent(
      AnalyticsEvent.CRASH_REPORT,
      errorDetails,
    );

    // Alert if threshold is exceeded (production alert)
    if (this.unhandledErrorCount >= this.MAX_ERRORS_THRESHOLD) {
      this.alertProductionIssue(errorDetails);
    }

    // In a real implementation:
    // crashlytics().recordError(error);
  }

  /**
   * Alert about critical production issues when error threshold is exceeded.
   */
  private alertProductionIssue(errorDetails: any): void {
    const message = `⚠️ PRODUCTION ALERT: Multiple errors detected (${errorDetails.errorCount}). Last error: ${errorDetails.message}`;
    logger.warn(message, errorDetails);

    // In a real implementation, send to monitoring service:
    // sendToMonitoringService(errorDetails);
    // notifyDevelopers(errorDetails);
    // sendSlackAlert(message);
  }

  /**
   * Manually report an error that was caught (e.g., in a try-catch block).
   */
  public reportError(
    error: Error | any,
    context?: string,
    extraData?: any,
  ): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    const payload = {
      context,
      message: errorMessage,
      stack: errorStack,
      ...extraData,
    };

    logger.error(
      `⚠️ [ErrorReport] ${context ? `[${context}] ` : ""}${errorMessage}`,
      payload,
    );

    mobileAnalyticsService.trackEvent(AnalyticsEvent.API_ERROR, payload);

    // In a real implementation:
    // crashlytics().recordError(error);
  }

  /**
   * Tag the current crash report with user ID to help debugging specific user issues.
   */
  public setUser(userId: string): void {
    logger.debug(`CrashReporting: Bound to user ${userId}`);
    // crashlytics().setUserId(userId);
  }

  /**
   * Reset error count (useful for recovery scenarios).
   */
  public resetErrorCount(): void {
    this.unhandledErrorCount = 0;
    logger.debug("CrashReporting: Error count reset");
  }

  /**
   * Get current error count.
   */
  public getErrorCount(): number {
    return this.unhandledErrorCount;
  }
}

export const crashReportingService = new CrashReportingService();
export default crashReportingService;
