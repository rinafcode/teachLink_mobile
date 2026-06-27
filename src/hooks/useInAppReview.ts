import { useCallback, useEffect, useState } from 'react';

import { inAppReviewService, ReviewTrigger, ReviewRequestResult } from '../services/inAppReview';
import { useReviewStore } from '../store/reviewStore';
import { appLogger } from '../utils/logger';

/**
 * Hook for managing in-app review requests.
 * 
 * This hook provides:
 * - Easy access to review request functionality
 * - Automatic metric tracking
 * - Review eligibility checking
 * 
 * Usage:
 * ```typescript
 * const { requestReview, isSupported, canRequestReview } = useInAppReview();
 * 
 * // After a positive user experience
 * const handleCourseComplete = async () => {
 *   await requestReview(ReviewTrigger.COURSE_MILESTONE);
 * };
 * 
 * // Check if review is supported
 * if (isSupported) {
 *   // Show "Rate Us" button
 * }
 * ```
 */
export function useInAppReview() {
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const getMetrics = useReviewStore((state) => state.getMetrics);
  const recordReviewRequest = useReviewStore((state) => state.recordReviewRequest);

  // Check if in-app review is supported on this device
  useEffect(() => {
    let mounted = true;

    const checkSupport = async () => {
      try {
        const supported = await inAppReviewService.isSupported();
        if (mounted) {
          setIsSupported(supported);
        }
      } catch (error) {
        appLogger.error('useInAppReview: Failed to check support', error);
        if (mounted) {
          setIsSupported(false);
        }
      }
    };

    checkSupport();

    return () => {
      mounted = false;
    };
  }, []);

  /**
   * Request an app store review at an optimal moment.
   * 
   * @param trigger The positive experience that triggered this request
   * @returns Result indicating whether the prompt was shown
   */
  const requestReview = useCallback(
    async (trigger: ReviewTrigger): Promise<ReviewRequestResult> => {
      setIsLoading(true);

      try {
        const metrics = getMetrics();
        const result = await inAppReviewService.requestReview(trigger, metrics);

        // Record the request in the store
        recordReviewRequest(trigger, result.shown, result.reason);

        return result;
      } catch (error) {
        appLogger.error('useInAppReview: Failed to request review', error);
        
        const errorResult: ReviewRequestResult = {
          shown: false,
          reason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          trigger,
          timestamp: Date.now(),
        };

        recordReviewRequest(trigger, false, errorResult.reason);
        
        return errorResult;
      } finally {
        setIsLoading(false);
      }
    },
    [getMetrics, recordReviewRequest]
  );

  /**
   * Check if we can show the review prompt (without actually showing it).
   * Useful for conditional UI or testing.
   */
  const canRequestReview = useCallback(async (): Promise<boolean> => {
    try {
      return await inAppReviewService.hasReviewAction();
    } catch (error) {
      appLogger.error('useInAppReview: Failed to check canRequestReview', error);
      return false;
    }
  }, []);

  /**
   * Get the app store URL for manual review requests.
   * Useful for "Rate Us" buttons in settings.
   */
  const getStoreUrl = useCallback(async (): Promise<string | null> => {
    try {
      return await inAppReviewService.getStoreUrl();
    } catch (error) {
      appLogger.error('useInAppReview: Failed to get store URL', error);
      return null;
    }
  }, []);

  return {
    /** Whether in-app review is supported on this device */
    isSupported,
    /** Whether a review request is currently in progress */
    isLoading,
    /** Request an app store review */
    requestReview,
    /** Check if we can show the review prompt */
    canRequestReview,
    /** Get the app store URL for manual reviews */
    getStoreUrl,
  };
}

/**
 * Hook for tracking user engagement metrics that influence review eligibility.
 * 
 * This hook provides convenient methods to update metrics when positive
 * experiences occur in the app.
 * 
 * Usage:
 * ```typescript
 * const { trackCourseComplete, trackPerfectQuiz, trackAchievement } = useReviewMetrics();
 * 
 * // After user completes a course
 * trackCourseComplete();
 * 
 * // After user gets a perfect quiz score
 * trackPerfectQuiz();
 * ```
 */
export function useReviewMetrics() {
  const incrementCoursesCompleted = useReviewStore((state) => state.incrementCoursesCompleted);
  const incrementSessionCount = useReviewStore((state) => state.incrementSessionCount);
  const incrementAchievementsUnlocked = useReviewStore((state) => state.incrementAchievementsUnlocked);
  const setLearningStreak = useReviewStore((state) => state.setLearningStreak);
  const incrementPerfectQuizScores = useReviewStore((state) => state.incrementPerfectQuizScores);

  const trackCourseComplete = useCallback(() => {
    incrementCoursesCompleted();
    appLogger.debug('useReviewMetrics: Course completed');
  }, [incrementCoursesCompleted]);

  const trackSession = useCallback(() => {
    incrementSessionCount();
    appLogger.debug('useReviewMetrics: Session tracked');
  }, [incrementSessionCount]);

  const trackAchievement = useCallback(() => {
    incrementAchievementsUnlocked();
    appLogger.debug('useReviewMetrics: Achievement unlocked');
  }, [incrementAchievementsUnlocked]);

  const trackLearningStreak = useCallback(
    (streak: number) => {
      setLearningStreak(streak);
      appLogger.debug(`useReviewMetrics: Learning streak updated to ${streak}`);
    },
    [setLearningStreak]
  );

  const trackPerfectQuiz = useCallback(() => {
    incrementPerfectQuizScores();
    appLogger.debug('useReviewMetrics: Perfect quiz score');
  }, [incrementPerfectQuizScores]);

  return {
    /** Track when a user completes a course */
    trackCourseComplete,
    /** Track when a user starts a new session */
    trackSession,
    /** Track when a user unlocks an achievement */
    trackAchievement,
    /** Track the user's current learning streak */
    trackLearningStreak,
    /** Track when a user gets a perfect quiz score */
    trackPerfectQuiz,
  };
}
