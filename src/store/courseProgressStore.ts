import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { asyncStorageJSONStorage, createHydrationErrorRecovery } from './persistence';

import type { CourseProgress } from '../types/course';

interface CourseProgressState {
  // keyed by courseId
  progressMap: Record<string, CourseProgress>;
  setCourseProgress: (courseId: string, progress: CourseProgress) => void;
  getCourseProgress: (courseId: string) => CourseProgress | null;
}

const INITIAL_COURSE_PROGRESS_STATE = {
  progressMap: {},
};

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
