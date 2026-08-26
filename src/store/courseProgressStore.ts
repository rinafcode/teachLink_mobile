// Unified course-progress store — fixes #967
// Single source of truth; duplicate in src/store/{slices}/courseProgressStore.ts removed.

export interface CourseProgress {
  courseId: string;
  completedLessons: string[];
  totalLessons: number;
  lastAccessedAt: string | null;
}

interface CourseProgressStore {
  progress: Record<string, CourseProgress>;
  setProgress(courseId: string, data: Partial<CourseProgress>): void;
  getProgress(courseId: string): CourseProgress | undefined;
  markLessonComplete(courseId: string, lessonId: string): void;
  clearProgress(): void;
}

const progressMap: Record<string, CourseProgress> = {};

export const courseProgressStore: CourseProgressStore = {
  progress: progressMap,

  setProgress(courseId, data) {
    progressMap[courseId] = { ...progressMap[courseId], ...data, courseId };
  },

  getProgress(courseId) {
    return progressMap[courseId];
  },

  markLessonComplete(courseId, lessonId) {
    const existing = progressMap[courseId] ?? {
      courseId, completedLessons: [], totalLessons: 0, lastAccessedAt: null,
    };
    if (!existing.completedLessons.includes(lessonId)) {
      existing.completedLessons.push(lessonId);
    }
    existing.lastAccessedAt = new Date().toISOString();
    progressMap[courseId] = existing;
  },

  clearProgress() {
    Object.keys(progressMap).forEach((k) => delete progressMap[k]);
  },
};