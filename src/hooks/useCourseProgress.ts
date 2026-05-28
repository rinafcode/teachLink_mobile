import { useState, useEffect, useCallback, useRef } from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { CourseProgress, LessonProgress, Note, Course } from '../types/course';
import apiClient from '../services/api/axios.config';
import { useCourseProgressStore } from '../store/courseProgressStore';
import logger from '../utils/logger';

const PROGRESS_STORAGE_KEY = 'course_progress';
const SYNC_DEBOUNCE_MS = 2000;

interface UseCourseProgressOptions {
  courseId: string;
  course?: Course;
  autoSync?: boolean;
}

interface UseCourseProgressReturn {
  // Simplified interface required by issue #152
  progress: { lessonId: string; position: number; percentage: number } | null;
  updateProgress: (lessonId: string, position: number) => void;
  isLoading: boolean;
  // Full interface (existing callers)
  fullProgress: CourseProgress | null;
  updateLessonProgress: (lessonId: string, progress: Partial<LessonProgress>) => Promise<void>;
  markLessonComplete: (lessonId: string) => Promise<void>;
  setCurrentLesson: (lessonId: string, sectionId: string) => Promise<void>;
  addBookmark: (lessonId: string) => Promise<void>;
  removeBookmark: (lessonId: string) => Promise<void>;
  addNote: (lessonId: string, content: string, timestamp: number) => Promise<Note>;
  updateNote: (lessonId: string, noteId: string, content: string) => Promise<void>;
  deleteNote: (lessonId: string, noteId: string) => Promise<void>;
  updateLastPosition: (lessonId: string, position: number) => Promise<void>;
  calculateOverallProgress: () => number;
  syncProgress: () => Promise<void>;
}

export function useCourseProgress({
  courseId,
  course,
  autoSync = true,
}: UseCourseProgressOptions): UseCourseProgressReturn {
  const [fullProgress, setFullProgress] = useState<CourseProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { setCourseProgress } = useCourseProgressStore();

  // Debounce timer ref for server sync
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const storageKey = `${PROGRESS_STORAGE_KEY}_${courseId}`;

  const buildInitialProgress = useCallback((): CourseProgress => ({
    courseId,
    currentLessonId: course?.sections[0]?.lessons[0]?.id ?? '',
    currentSectionId: course?.sections[0]?.id ?? '',
    lessons: {},
    quizzes: {},
    overallProgress: 0,
    lastAccessed: new Date().toISOString(),
    bookmarks: [],
    notes: {},
  }), [courseId, course]);

  // ── Load from AsyncStorage on init ────────────────────────────────────────

  const loadProgress = useCallback(async () => {
    try {
      setIsLoading(true);
      const stored = await AsyncStorage.getItem(storageKey);
      const parsed: CourseProgress = stored
        ? JSON.parse(stored)
        : buildInitialProgress();

      if (!stored) {
        await AsyncStorage.setItem(storageKey, JSON.stringify(parsed));
      }

      setFullProgress(parsed);
      setCourseProgress(courseId, parsed);
    } catch (error) {
      logger.error('useCourseProgress: loadProgress error', error);
      const fallback = buildInitialProgress();
      setFullProgress(fallback);
      setCourseProgress(courseId, fallback);
    } finally {
      setIsLoading(false);
    }
  }, [storageKey, courseId, buildInitialProgress, setCourseProgress]);

  // ── Persist to AsyncStorage + update store ────────────────────────────────

  const saveProgress = useCallback(async (updated: CourseProgress) => {
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
      setFullProgress(updated);
      setCourseProgress(courseId, updated);
    } catch (error) {
      logger.error('useCourseProgress: saveProgress error', error);
    }
  }, [storageKey, courseId, setCourseProgress]);

  // ── Debounced server sync (PATCH /api/progress/:courseId) ─────────────────

  const syncProgress = useCallback(async (progressToSync?: CourseProgress) => {
    const data = progressToSync ?? fullProgress;
    if (!data) return;
    try {
      await apiClient.patch(`/api/progress/${courseId}`, data);
    } catch (error: any) {
      if (error.code !== 'ERR_NETWORK' && error.message !== 'Network Error') {
        logger.error('useCourseProgress: syncProgress error', error);
      }
    }
  }, [courseId, fullProgress]);

  const scheduleSyncDebounced = useCallback((data: CourseProgress) => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      syncProgress(data);
    }, SYNC_DEBOUNCE_MS);
  }, [syncProgress]);

  // ── calculateOverallProgress ──────────────────────────────────────────────

  const calculateOverallProgress = useCallback((): number => {
    if (!course || !fullProgress) return 0;
    const total = course.totalLessons;
    if (total === 0) return 0;
    const completed = Object.values(fullProgress.lessons).filter((l) => l.completed).length;
    return Math.round((completed / total) * 100);
  }, [course, fullProgress]);

  // ── updateLessonProgress ──────────────────────────────────────────────────

  const updateLessonProgress = useCallback(
    async (lessonId: string, lessonProgress: Partial<LessonProgress>) => {
      if (!fullProgress) return;

      const existing = fullProgress.lessons[lessonId] ?? {
        lessonId,
        completed: false,
        lastPosition: 0,
        timeSpent: 0,
      };

      const updated: CourseProgress = {
        ...fullProgress,
        lessons: {
          ...fullProgress.lessons,
          [lessonId]: { ...existing, ...lessonProgress },
        },
        lastAccessed: new Date().toISOString(),
      };
      updated.overallProgress = calculateOverallProgress();

      await saveProgress(updated);
      scheduleSyncDebounced(updated);
    },
    [fullProgress, saveProgress, calculateOverallProgress, scheduleSyncDebounced],
  );

  // ── Simplified updateProgress (issue #152 requirement) ───────────────────

  const updateProgress = useCallback(
    (lessonId: string, position: number) => {
      updateLessonProgress(lessonId, { lastPosition: position });
    },
    [updateLessonProgress],
  );

  // ── markLessonComplete ────────────────────────────────────────────────────

  const markLessonComplete = useCallback(
    async (lessonId: string) => {
      await updateLessonProgress(lessonId, {
        completed: true,
        completedAt: new Date().toISOString(),
      });
    },
    [updateLessonProgress],
  );

  // ── setCurrentLesson ──────────────────────────────────────────────────────

  const setCurrentLesson = useCallback(
    async (lessonId: string, sectionId: string) => {
      if (!fullProgress) return;
      const updated: CourseProgress = {
        ...fullProgress,
        currentLessonId: lessonId,
        currentSectionId: sectionId,
        lastAccessed: new Date().toISOString(),
      };
      await saveProgress(updated);
      scheduleSyncDebounced(updated);
    },
    [fullProgress, saveProgress, scheduleSyncDebounced],
  );

  // ── updateLastPosition ────────────────────────────────────────────────────

  const updateLastPosition = useCallback(
    async (lessonId: string, position: number) => {
      const existing = fullProgress?.lessons[lessonId];
      await updateLessonProgress(lessonId, {
        lastPosition: position,
        timeSpent: (existing?.timeSpent ?? 0) + 1,
      });
    },
    [fullProgress, updateLessonProgress],
  );

  // ── addBookmark ───────────────────────────────────────────────────────────

  const addBookmark = useCallback(
    async (lessonId: string) => {
      if (!fullProgress || fullProgress.bookmarks.includes(lessonId)) return;
      const updated: CourseProgress = {
        ...fullProgress,
        bookmarks: [...fullProgress.bookmarks, lessonId],
      };
      await saveProgress(updated);
      scheduleSyncDebounced(updated);
    },
    [fullProgress, saveProgress, scheduleSyncDebounced],
  );

  // ── removeBookmark ────────────────────────────────────────────────────────

  const removeBookmark = useCallback(
    async (lessonId: string) => {
      if (!fullProgress) return;
      const updated: CourseProgress = {
        ...fullProgress,
        bookmarks: fullProgress.bookmarks.filter((id) => id !== lessonId),
      };
      await saveProgress(updated);
      scheduleSyncDebounced(updated);
    },
    [fullProgress, saveProgress, scheduleSyncDebounced],
  );

  // ── addNote ───────────────────────────────────────────────────────────────

  const addNote = useCallback(
    async (lessonId: string, content: string, timestamp: number): Promise<Note> => {
      if (!fullProgress) throw new Error('Progress not loaded');
      const note: Note = {
        id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        lessonId,
        content,
        timestamp,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const updated: CourseProgress = {
        ...fullProgress,
        notes: {
          ...fullProgress.notes,
          [lessonId]: [...(fullProgress.notes[lessonId] ?? []), note],
        },
      };
      await saveProgress(updated);
      scheduleSyncDebounced(updated);
      return note;
    },
    [fullProgress, saveProgress, scheduleSyncDebounced],
  );

  // ── updateNote ────────────────────────────────────────────────────────────

  const updateNote = useCallback(
    async (lessonId: string, noteId: string, content: string) => {
      if (!fullProgress) return;
      const updated: CourseProgress = {
        ...fullProgress,
        notes: {
          ...fullProgress.notes,
          [lessonId]: (fullProgress.notes[lessonId] ?? []).map((n) =>
            n.id === noteId ? { ...n, content, updatedAt: new Date().toISOString() } : n,
          ),
        },
      };
      await saveProgress(updated);
      scheduleSyncDebounced(updated);
    },
    [fullProgress, saveProgress, scheduleSyncDebounced],
  );

  // ── deleteNote ────────────────────────────────────────────────────────────

  const deleteNote = useCallback(
    async (lessonId: string, noteId: string) => {
      if (!fullProgress) return;
      const updated: CourseProgress = {
        ...fullProgress,
        notes: {
          ...fullProgress.notes,
          [lessonId]: (fullProgress.notes[lessonId] ?? []).filter((n) => n.id !== noteId),
        },
      };
      await saveProgress(updated);
      scheduleSyncDebounced(updated);
    },
    [fullProgress, saveProgress, scheduleSyncDebounced],
  );

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    loadProgress();
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [loadProgress]);

  // ── Derived simplified progress ───────────────────────────────────────────

  const progress = fullProgress
    ? {
        lessonId: fullProgress.currentLessonId,
        position: fullProgress.lessons[fullProgress.currentLessonId]?.lastPosition ?? 0,
        percentage: fullProgress.overallProgress,
      }
    : null;

  return {
    progress,
    updateProgress,
    isLoading,
    fullProgress,
    updateLessonProgress,
    markLessonComplete,
    setCurrentLesson,
    addBookmark,
    removeBookmark,
    addNote,
    updateNote,
    deleteNote,
    updateLastPosition,
    calculateOverallProgress,
    syncProgress,
  };
}
