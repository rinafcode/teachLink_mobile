import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { ReviewTrigger } from '../services/inAppReview';
import { asyncStorageJSONStorage } from './persistence';

/**
 * Review request history entry
 */
export interface ReviewRequestHistory {
  /** When the request was made */
  timestamp: number;
  /** What triggered the request */
  trigger: ReviewTrigger;
  /** Whether the prompt was actually shown */
  shown: boolean;
  /** Reason for the result */
  reason: string;
}

/**
 * Review metrics and preferences
 */
interface ReviewState {
  /** When the app was first installed */
  installDate: number;
  /** When the last review request was made */
  lastReviewRequestDate: number | null;
  /** Total number of review requests made */
  reviewRequestCount: number;
  /** Number of review requests made in the current year */
  reviewRequestsThisYear: number;
  /** Year of the last review request (for annual reset) */
  lastRequestYear: number | null;
  /** User opted out of review requests */
  doNotAskAgain: boolean;
  /** History of all review requests */
  requestHistory: ReviewRequestHistory[];
  /** Number of courses completed (for eligibility) */
  coursesCompleted: number;
  /** Number of app sessions (for eligibility) */
  sessionCount: number;
  /** Number of achievements unlocked */
  achievementsUnlocked: number;
  /** Current learning streak in days */
  learningStreak: number;
  /** Number of perfect quiz scores */
  perfectQuizScores: number;

  // Actions
  /** Record a review request attempt */
  recordReviewRequest: (
    trigger: ReviewTrigger,
    shown: boolean,
    reason: string
  ) => void;
  /** Increment courses completed */
  incrementCoursesCompleted: () => void;
  /** Increment session count */
  incrementSessionCount: () => void;
  /** Increment achievements unlocked */
  incrementAchievementsUnlocked: () => void;
  /** Update learning streak */
  setLearningStreak: (streak: number) => void;
  /** Increment perfect quiz scores */
  incrementPerfectQuizScores: () => void;
  /** Set "Don't ask again" preference */
  setDoNotAskAgain: (value: boolean) => void;
  /** Reset all review metrics (for testing) */
  resetReviewMetrics: () => void;
  /** Get metrics for eligibility check */
  getMetrics: () => {
    installDate: number;
    lastReviewRequestDate: number | null;
    reviewRequestCount: number;
    coursesCompleted: number;
    sessionCount: number;
    doNotAskAgain: boolean;
  };
}

/**
 * Review store manages all metrics and preferences related to in-app reviews.
 * 
 * This store tracks:
 * - User engagement metrics (courses, sessions, achievements)
 * - Review request history and timing
 * - User preferences (opt-out)
 * 
 * Usage:
 * ```typescript
 * import { useReviewStore } from '@/store/reviewStore';
 * 
 * const { incrementCoursesCompleted, getMetrics } = useReviewStore();
 * 
 * // After user completes a course
 * incrementCoursesCompleted();
 * 
 * // Get metrics for review eligibility
 * const metrics = getMetrics();
 * ```
 */
export const useReviewStore = create<ReviewState>()(
  persist(
    (set, get) => ({
      // Initial state
      installDate: Date.now(),
      lastReviewRequestDate: null,
      reviewRequestCount: 0,
      reviewRequestsThisYear: 0,
      lastRequestYear: null,
      doNotAskAgain: false,
      requestHistory: [],
      coursesCompleted: 0,
      sessionCount: 0,
      achievementsUnlocked: 0,
      learningStreak: 0,
      perfectQuizScores: 0,

      // Actions
      recordReviewRequest: (trigger, shown, reason) => {
        const now = Date.now();
        const currentYear = new Date(now).getFullYear();
        const state = get();

        // Reset yearly counter if it's a new year
        const reviewRequestsThisYear =
          state.lastRequestYear === currentYear
            ? state.reviewRequestsThisYear + 1
            : 1;

        set({
          lastReviewRequestDate: now,
          reviewRequestCount: state.reviewRequestCount + 1,
          reviewRequestsThisYear,
          lastRequestYear: currentYear,
          requestHistory: [
            ...state.requestHistory,
            {
              timestamp: now,
              trigger,
              shown,
              reason,
            },
          ].slice(-20), // Keep only last 20 entries
        });
      },

      incrementCoursesCompleted: () =>
        set((state) => ({
          coursesCompleted: state.coursesCompleted + 1,
        })),

      incrementSessionCount: () =>
        set((state) => ({
          sessionCount: state.sessionCount + 1,
        })),

      incrementAchievementsUnlocked: () =>
        set((state) => ({
          achievementsUnlocked: state.achievementsUnlocked + 1,
        })),

      setLearningStreak: (streak) =>
        set({
          learningStreak: streak,
        }),

      incrementPerfectQuizScores: () =>
        set((state) => ({
          perfectQuizScores: state.perfectQuizScores + 1,
        })),

      setDoNotAskAgain: (value) =>
        set({
          doNotAskAgain: value,
        }),

      resetReviewMetrics: () =>
        set({
          lastReviewRequestDate: null,
          reviewRequestCount: 0,
          reviewRequestsThisYear: 0,
          lastRequestYear: null,
          doNotAskAgain: false,
          requestHistory: [],
        }),

      getMetrics: () => {
        const state = get();
        return {
          installDate: state.installDate,
          lastReviewRequestDate: state.lastReviewRequestDate,
          reviewRequestCount: state.reviewRequestCount,
          coursesCompleted: state.coursesCompleted,
          sessionCount: state.sessionCount,
          doNotAskAgain: state.doNotAskAgain,
        };
      },
    }),
    {
      name: 'review-storage',
      version: 1,
      storage: asyncStorageJSONStorage,
      // Persist everything except the getMetrics function
      partialize: (state) => ({
        installDate: state.installDate,
        lastReviewRequestDate: state.lastReviewRequestDate,
        reviewRequestCount: state.reviewRequestCount,
        reviewRequestsThisYear: state.reviewRequestsThisYear,
        lastRequestYear: state.lastRequestYear,
        doNotAskAgain: state.doNotAskAgain,
        requestHistory: state.requestHistory,
        coursesCompleted: state.coursesCompleted,
        sessionCount: state.sessionCount,
        achievementsUnlocked: state.achievementsUnlocked,
        learningStreak: state.learningStreak,
        perfectQuizScores: state.perfectQuizScores,
      }),
    }
  )
);

/**
 * Selector hooks for granular subscriptions
 */

/** Get review metrics for eligibility check */
export const useReviewMetrics = () => useReviewStore((state) => state.getMetrics());

/** Get courses completed count */
export const useCoursesCompleted = () => useReviewStore((state) => state.coursesCompleted);

/** Get session count */
export const useSessionCount = () => useReviewStore((state) => state.sessionCount);

/** Get "Don't ask again" preference */
export const useDoNotAskAgain = () => useReviewStore((state) => state.doNotAskAgain);

/** Get review request history */
export const useReviewHistory = () => useReviewStore((state) => state.requestHistory);

/** Get all review actions */
export const useReviewActions = () =>
  useReviewStore((state) => ({
    recordReviewRequest: state.recordReviewRequest,
    incrementCoursesCompleted: state.incrementCoursesCompleted,
    incrementSessionCount: state.incrementSessionCount,
    incrementAchievementsUnlocked: state.incrementAchievementsUnlocked,
    setLearningStreak: state.setLearningStreak,
    incrementPerfectQuizScores: state.incrementPerfectQuizScores,
    setDoNotAskAgain: state.setDoNotAskAgain,
    resetReviewMetrics: state.resetReviewMetrics,
  }));
