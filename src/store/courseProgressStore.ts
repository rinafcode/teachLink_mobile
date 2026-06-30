import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { asyncStorageJSONStorage, createHydrationErrorRecovery } from './persistence';

import type { CourseProgress, LessonProgress } from '../types/course';

interface CourseProgressState {
  // keyed by courseId
  progressMap: Record<string, CourseProgress>;
  setCourseProgress: (courseId: string, progress: CourseProgress) => void;
  getCourseProgress: (courseId: string) => CourseProgress | null;
  markLessonComplete: (
    courseId: string,
    lessonId: string,
    totalLessons: number,
    lessonData?: Partial<LessonProgress>
  ) => void;
  isCourseComplete: (courseId: string, totalLessons: number) => boolean;
}

const INITIAL_COURSE_PROGRESS_STATE = {
  progressMap: {},
};

/**
 * Tracks lesson completions currently within the 500 ms deduplication window.
 * Key format: `${courseId}:${lessonId}` — module-level so it persists across
 * store resets and is not serialised to AsyncStorage.
 */
export const completionInProgress = new Set<string>();

/** Exposed for tests so they can drain pending timers cleanly. */
export const _completionTimers = new Map<string, ReturnType<typeof setTimeout>>();

let resetCourseProgressStoreAfterHydrationError = () => {};

export const useCourseProgressStore = create<CourseProgressState>()(
  persist(
    (set, get): CourseProgressState => {
      resetCourseProgressStoreAfterHydrationError = () => set(INITIAL_COURSE_PROGRESS_STATE);

      return {
        ...INITIAL_COURSE_PROGRESS_STATE,

        setCourseProgress: (courseId, progress) =>
          set(s => ({ progressMap: { ...s.progressMap, [courseId]: progress } })),

        getCourseProgress: courseId => get().progressMap[courseId] ?? null,

        markLessonComplete: (courseId, lessonId, totalLessons, lessonData) => {
          // ── Deduplication guard ───────────────────────────────────────────
          // A 500 ms window prevents duplicate completion records when multiple
          // triggers fire for the same lesson (e.g., video-end + manual skip).
          const key = `${courseId}:${lessonId}`;
          if (completionInProgress.has(key)) return;

          completionInProgress.add(key);

          // Clear any pre-existing timer for this key before setting a new one.
          const existingTimer = _completionTimers.get(key);
          if (existingTimer !== undefined) clearTimeout(existingTimer);

          _completionTimers.set(
            key,
            setTimeout(() => {
              completionInProgress.delete(key);
              _completionTimers.delete(key);
            }, 500)
          );
          // ─────────────────────────────────────────────────────────────────

          set(s => {
            const existing = s.progressMap[courseId];
            if (!existing) return s;

            const lessonProgress: LessonProgress = {
              lessonId,
              completed: true,
              lastPosition: 0,
              timeSpent: 0,
              completedAt: new Date().toISOString(),
              ...lessonData,
            };

            const updatedLessons = { ...existing.lessons, [lessonId]: lessonProgress };
            const completedLessons = Object.values(updatedLessons).filter(l => l.completed).length;

            // Use integer comparison as primary check; >= 99.5 as float fallback
            const computedPercentage =
              totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
            const isComplete = completedLessons === totalLessons || computedPercentage >= 99.5;
            const overallProgress = isComplete
              ? 100
              : Math.min(99, Math.round(computedPercentage * 10) / 10);

            return {
              progressMap: {
                ...s.progressMap,
                [courseId]: { ...existing, lessons: updatedLessons, overallProgress },
              },
            };
          });
        },

        isCourseComplete: (courseId, totalLessons) => {
          const progress = get().progressMap[courseId];
          if (!progress) return false;
          const completedLessons = Object.values(progress.lessons).filter(l => l.completed).length;
          return completedLessons === totalLessons || progress.overallProgress >= 99.5;
        },
      };
    },
    {
      name: 'course-progress-storage',
      version: 1,
      storage: asyncStorageJSONStorage,
      onRehydrateStorage: createHydrationErrorRecovery(
        'course-progress-storage',
        resetCourseProgressStoreAfterHydrationError
      ),
      partialize: state => ({
        progressMap: state.progressMap,
      }),
    }
  )
);
