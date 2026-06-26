import * as StoreReview from 'expo-store-review';
import { Platform } from 'react-native';

import { appLogger } from '../utils/logger';
import { AnalyticsEvent } from '../utils/trackingEvents';
import mobileAnalyticsService from './mobileAnalytics';

/**
 * Optimal moments to request app store reviews.
 * These represent positive user experiences that indicate satisfaction.
 */
export enum ReviewTrigger {
  /** User completed their first course */
  FIRST_COURSE_COMPLETED = 'first_course_completed',
  /** User completed multiple courses (milestone) */
  COURSE_MILESTONE = 'course_milestone',
  /** User achieved a perfect quiz score */
  PERFECT_QUIZ_SCORE = 'perfect_quiz_score',
  /** User unlocked a significant achievement */
  ACHIEVEMENT_UNLOCKED = 'achievement_unlocked',
  /** User has been actively engaged for multiple sessions */
  ACTIVE_ENGAGEMENT = 'active_engagement',
  /** User completed a learning streak */
  LEARNING_STREAK = 'learning_streak',
  /** User shared content or invited friends */
  SOCIAL_ENGAGEMENT = 'social_engagement',
  /** Manual trigger (e.g., from settings) */
  MANUAL_REQUEST = 'manual_request',
}

/**
 * Configuration for review request behavior
 */
export interface ReviewConfig {
  /** Minimum days since app install before requesting review */
  minDaysSinceInstall: number;
  /** Minimum days since last review request */
  minDaysSinceLastRequest: number;
  /** Maximum number of review requests per year */
  maxRequestsPerYear: number;
  /** Minimum number of courses completed before requesting */
  minCoursesCompleted: number;
  /** Minimum number of app sessions before requesting */
  minSessions: number;
  /** Whether to respect user's "Don't ask again" preference */
  respectDoNotAskAgain: boolean;
}

/**
 * Default configuration optimized for user experience
 */
export const DEFAULT_REVIEW_CONFIG: ReviewConfig = {
  minDaysSinceInstall: 7, // Wait a week after install
  minDaysSinceLastRequest: 90, // Wait 3 months between requests
  maxRequestsPerYear: 3, // Maximum 3 requests per year
  minCoursesCompleted: 2, // User should complete at least 2 courses
  minSessions: 5, // User should have at least 5 sessions
  respectDoNotAskAgain: true,
};

/**
 * Result of a review request attempt
 */
export interface ReviewRequestResult {
  /** Whether the review prompt was shown */
  shown: boolean;
  /** Reason why the prompt was or wasn't shown */
  reason: string;
  /** The trigger that initiated the request */
  trigger: ReviewTrigger;
  /** Timestamp of the request */
  timestamp: number;
}

/**
 * InAppReviewService manages app store review requests at optimal times.
 * 
 * Key features:
 * - Smart timing based on positive user experiences
 * - Respects platform guidelines (iOS/Android)
 * - Tracks metrics to avoid over-requesting
 * - Configurable thresholds and behavior
 * 
 * Usage:
 * ```typescript
 * import { inAppReviewService, ReviewTrigger } from '@/services/inAppReview';
 * 
 * // After a positive user experience
 * await inAppReviewService.requestReview(ReviewTrigger.COURSE_MILESTONE);
 * ```
 */
class InAppReviewService {
  private config: ReviewConfig = DEFAULT_REVIEW_CONFIG;
  private isAvailable: boolean = false;

  /**
   * Initialize the review service and check platform availability
   */
  public async init(): Promise<void> {
    try {
      this.isAvailable = await StoreReview.isAvailableAsync();
      
      if (!this.isAvailable) {
        appLogger.warn('InAppReview: Store review not available on this device');
      } else {
        appLogger.info('InAppReview: Service initialized successfully');
      }
    } catch (error) {
      appLogger.error('InAppReview: Failed to initialize', error);
      this.isAvailable = false;
    }
  }

  /**
   * Update the review configuration
   */
  public setConfig(config: Partial<ReviewConfig>): void {
    this.config = { ...this.config, ...config };
    appLogger.debug('InAppReview: Configuration updated', this.config);
  }

  /**
   * Get the current configuration
   */
  public getConfig(): ReviewConfig {
    return { ...this.config };
  }

  /**
   * Check if the device supports in-app reviews
   */
  public async isSupported(): Promise<boolean> {
    if (!this.isAvailable) {
      await this.init();
    }
    return this.isAvailable;
  }

  /**
   * Request an app store review at an optimal moment.
   * 
   * This method:
   * 1. Checks if review is available on the platform
   * 2. Validates eligibility based on config and metrics
   * 3. Shows the native review prompt if eligible
   * 4. Tracks the request for analytics and future eligibility
   * 
   * @param trigger The positive experience that triggered this request
   * @param metrics Current user engagement metrics
   * @returns Result indicating whether the prompt was shown and why
   */
  public async requestReview(
    trigger: ReviewTrigger,
    metrics: {
      installDate: number;
      lastReviewRequestDate: number | null;
      reviewRequestCount: number;
      coursesCompleted: number;
      sessionCount: number;
      doNotAskAgain: boolean;
    }
  ): Promise<ReviewRequestResult> {
    const timestamp = Date.now();
    
    // Check platform support
    if (!this.isAvailable) {
      const result: ReviewRequestResult = {
        shown: false,
        reason: 'Platform does not support in-app reviews',
        trigger,
        timestamp,
      };
      
      this.trackReviewRequest(result, metrics);
      return result;
    }

    // Check eligibility
    const eligibility = this.checkEligibility(metrics);
    
    if (!eligibility.eligible) {
      const result: ReviewRequestResult = {
        shown: false,
        reason: eligibility.reason,
        trigger,
        timestamp,
      };
      
      this.trackReviewRequest(result, metrics);
      return result;
    }

    // Request the review
    try {
      appLogger.info(`InAppReview: Requesting review for trigger: ${trigger}`);
      
      // Show the native review prompt
      await StoreReview.requestReview();
      
      const result: ReviewRequestResult = {
        shown: true,
        reason: 'Review prompt displayed successfully',
        trigger,
        timestamp,
      };
      
      this.trackReviewRequest(result, metrics);
      
      return result;
    } catch (error) {
      appLogger.error('InAppReview: Failed to request review', error);
      
      const result: ReviewRequestResult = {
        shown: false,
        reason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        trigger,
        timestamp,
      };
      
      this.trackReviewRequest(result, metrics);
      return result;
    }
  }

  /**
   * Check if the user is eligible for a review request
   */
  private checkEligibility(metrics: {
    installDate: number;
    lastReviewRequestDate: number | null;
    reviewRequestCount: number;
    coursesCompleted: number;
    sessionCount: number;
    doNotAskAgain: boolean;
  }): { eligible: boolean; reason: string } {
    const now = Date.now();
    const daysSinceInstall = (now - metrics.installDate) / (1000 * 60 * 60 * 24);
    
    // Check "Don't ask again" preference
    if (this.config.respectDoNotAskAgain && metrics.doNotAskAgain) {
      return { eligible: false, reason: 'User opted out of review requests' };
    }

    // Check minimum days since install
    if (daysSinceInstall < this.config.minDaysSinceInstall) {
      return {
        eligible: false,
        reason: `Too soon after install (${Math.floor(daysSinceInstall)} days, need ${this.config.minDaysSinceInstall})`,
      };
    }

    // Check minimum days since last request
    if (metrics.lastReviewRequestDate) {
      const daysSinceLastRequest =
        (now - metrics.lastReviewRequestDate) / (1000 * 60 * 60 * 24);
      
      if (daysSinceLastRequest < this.config.minDaysSinceLastRequest) {
        return {
          eligible: false,
          reason: `Too soon since last request (${Math.floor(daysSinceLastRequest)} days, need ${this.config.minDaysSinceLastRequest})`,
        };
      }
    }

    // Check maximum requests per year
    const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;
    if (
      metrics.lastReviewRequestDate &&
      metrics.lastReviewRequestDate > oneYearAgo &&
      metrics.reviewRequestCount >= this.config.maxRequestsPerYear
    ) {
      return {
        eligible: false,
        reason: `Maximum requests per year reached (${metrics.reviewRequestCount}/${this.config.maxRequestsPerYear})`,
      };
    }

    // Check minimum courses completed
    if (metrics.coursesCompleted < this.config.minCoursesCompleted) {
      return {
        eligible: false,
        reason: `Not enough courses completed (${metrics.coursesCompleted}/${this.config.minCoursesCompleted})`,
      };
    }

    // Check minimum sessions
    if (metrics.sessionCount < this.config.minSessions) {
      return {
        eligible: false,
        reason: `Not enough sessions (${metrics.sessionCount}/${this.config.minSessions})`,
      };
    }

    return { eligible: true, reason: 'All eligibility criteria met' };
  }

  /**
   * Track review request for analytics
   */
  private trackReviewRequest(
    result: ReviewRequestResult,
    metrics: {
      installDate: number;
      lastReviewRequestDate: number | null;
      reviewRequestCount: number;
      coursesCompleted: number;
      sessionCount: number;
      doNotAskAgain: boolean;
    }
  ): void {
    mobileAnalyticsService.trackEvent(AnalyticsEvent.REVIEW_REQUESTED, {
      shown: result.shown,
      reason: result.reason,
      trigger: result.trigger,
      platform: Platform.OS,
      daysSinceInstall: Math.floor((result.timestamp - metrics.installDate) / (1000 * 60 * 60 * 24)),
      daysSinceLastRequest: metrics.lastReviewRequestDate
        ? Math.floor((result.timestamp - metrics.lastReviewRequestDate) / (1000 * 60 * 60 * 24))
        : null,
      reviewRequestCount: metrics.reviewRequestCount,
      coursesCompleted: metrics.coursesCompleted,
      sessionCount: metrics.sessionCount,
    });

    appLogger.info('InAppReview: Request tracked', {
      result,
      metrics,
    });
  }

  /**
   * Check if we can show the review prompt (without actually showing it).
   * Useful for testing or conditional UI.
   */
  public async hasReviewAction(): Promise<boolean> {
    try {
      return await StoreReview.hasAction();
    } catch (error) {
      appLogger.error('InAppReview: Failed to check hasAction', error);
      return false;
    }
  }

  /**
   * Get the app store URL for manual review requests.
   * Useful for "Rate Us" buttons in settings.
   */
  public async getStoreUrl(): Promise<string | null> {
    try {
      return await StoreReview.storeUrl();
    } catch (error) {
      appLogger.error('InAppReview: Failed to get store URL', error);
      return null;
    }
  }
}

// Export singleton instance
export const inAppReviewService = new InAppReviewService();
export default inAppReviewService;
