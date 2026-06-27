import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { asyncStorageJSONStorage } from './persistence';

import type { CourseProgress } from '../types/course';

interface CourseProgressState {
  // keyed by courseId
  progressMap: Record<string, CourseProgress>;
  setCourseProgress: (courseId: string, progress: CourseProgress) => void;
  getCourseProgress: (courseId: string) => CourseProgress | null;
}

export const useCourseProgressStore = create<CourseProgressState>()(
  persist(
    (set, get) => ({
      progressMap: {},

      setCourseProgress: (courseId, progress) =>
        set(s => ({ progressMap: { ...s.progressMap, [courseId]: progress } })),

      getCourseProgress: courseId => get().progressMap[courseId] ?? null,
    }),
    {
      name: 'course-progress-storage',
      version: 1,
      storage: asyncStorageJSONStorage,
      partialize: state => ({
        progressMap: state.progressMap,
      }),
    }
  )
);
