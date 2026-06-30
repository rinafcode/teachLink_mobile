import { showErrorToast } from '@utils/toast';
import { create } from 'zustand';
import { appLogger } from '../../utils/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LessonProgress {
  lessonId: string;
  completedAt: string;
}

export interface CourseProgress {
  courseId: string;
  completedLessons: LessonProgress[];
  totalLessons: number;
  isCompleted: boolean;
  completedAt?: string;
}

interface CourseProgressState {
  progress: Record<string, CourseProgress>;
  isUpdating: boolean;
  completeLesson: (courseId: string, lessonId: string) => Promise<void>;
}

// ─── Event helpers ────────────────────────────────────────────────────────────

function emitCourseCompleted(courseId: string) {
  // Replace with your actual event bus / analytics call.
  // Kept as a named function so unit tests can spy on it.
  globalThis.dispatchEvent?.(new CustomEvent('courseCompleted', { detail: { courseId } }));
}

// ─── Server persist with retry ────────────────────────────────────────────────

async function updateProgressOnServer(
  courseId: string,
  payload: { completedLessons: LessonProgress[]; isCompleted: boolean; completedAt?: string },
  retries = 3
): Promise<void> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`/api/courses/${courseId}/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // 200 OK  → success (idempotent: already-completed courses also return 200)
      // 2xx     → treat as success
      if (response.ok) return;

      // Non-2xx: surface the status so the catch branch can log it.
      throw new Error(`Server responded with ${response.status}`);
    } catch (err) {
      lastError = err;
      await appLogger.warn(`updateProgressOnServer attempt ${attempt}/${retries} failed`, err);

      if (attempt < retries) {
        // Exponential back-off: 500 ms, 1 000 ms, 2 000 ms …
        await new Promise(r => setTimeout(r, 500 * attempt));
      }
    }
  }

  throw lastError;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCourseProgressStore = create<CourseProgressState>((set, get) => ({
  progress: {},
  isUpdating: false,

  completeLesson: async (courseId: string, lessonId: string) => {
    const current = get().progress[courseId];
    if (!current) {
      await appLogger.error('completeLesson called for unknown courseId', { courseId, lessonId });
      return;
    }

    // Avoid duplicate lesson completions.
    const alreadyRecorded = current.completedLessons.some(l => l.lessonId === lessonId);
    if (alreadyRecorded) return;

    const newLesson: LessonProgress = { lessonId, completedAt: new Date().toISOString() };
    const updatedLessons = [...current.completedLessons, newLesson];
    const reachedTotal = updatedLessons.length >= current.totalLessons;

    const updatedProgress: CourseProgress = {
      ...current,
      completedLessons: updatedLessons,
      // Do NOT mark isCompleted yet — we wait for server confirmation.
      isCompleted: current.isCompleted,
    };

    // Optimistically update local state so the UI reflects the new lesson.
    set(state => ({
      isUpdating: true,
      progress: { ...state.progress, [courseId]: updatedProgress },
    }));

    try {
      const serverPayload = {
        completedLessons: updatedLessons,
        isCompleted: reachedTotal,
        ...(reachedTotal ? { completedAt: new Date().toISOString() } : {}),
      };

      // ── Critical ordering: server must confirm before the event fires. ──
      await updateProgressOnServer(courseId, serverPayload);

      // Server confirmed — now commit the final state locally.
      const confirmedProgress: CourseProgress = {
        ...updatedProgress,
        isCompleted: reachedTotal,
        ...(reachedTotal ? { completedAt: serverPayload.completedAt } : {}),
      };

      set(state => ({
        isUpdating: false,
        progress: { ...state.progress, [courseId]: confirmedProgress },
      }));

      // ── Event fires only after server confirmation. ──
      if (reachedTotal) {
        emitCourseCompleted(courseId);
      }
    } catch (err) {
      await appLogger.error('Failed to persist lesson progress after retries', err, {
        courseId,
        lessonId,
      });

      // Roll back the optimistic local update so state stays consistent.
      set(state => ({
        isUpdating: false,
        progress: { ...state.progress, [courseId]: current },
      }));

      // Surface a toast — do NOT emit courseCompleted.
      showErrorToast('Could not save your progress. Please check your connection and try again.');
    }
  },
}));
