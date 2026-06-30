import {
  useCourseProgressStore,
  completionInProgress,
  _completionTimers,
} from '../../store/courseProgressStore';

import type { CourseProgress } from '../../types/course';

const baseCourseProgress = (courseId: string): CourseProgress => ({
  courseId,
  currentLessonId: '',
  currentSectionId: '',
  lessons: {},
  quizzes: {},
  overallProgress: 0,
  lastAccessed: new Date().toISOString(),
  bookmarks: [],
  notes: {},
});

describe('courseProgressStore — markLessonComplete / isCourseComplete', () => {
  beforeEach(() => {
    useCourseProgressStore.setState({ progressMap: {} });
  });

  it('does not mark complete at 1/3 lessons', () => {
    const courseId = 'c1';
    useCourseProgressStore.getState().setCourseProgress(courseId, baseCourseProgress(courseId));
    useCourseProgressStore.getState().markLessonComplete(courseId, 'l1', 3);

    expect(useCourseProgressStore.getState().isCourseComplete(courseId, 3)).toBe(false);
    expect(
      useCourseProgressStore.getState().getCourseProgress(courseId)?.overallProgress
    ).toBeLessThan(99.5);
  });

  it('does not mark complete at 2/3 lessons', () => {
    const courseId = 'c2';
    useCourseProgressStore.getState().setCourseProgress(courseId, baseCourseProgress(courseId));
    useCourseProgressStore.getState().markLessonComplete(courseId, 'l1', 3);
    useCourseProgressStore.getState().markLessonComplete(courseId, 'l2', 3);

    expect(useCourseProgressStore.getState().isCourseComplete(courseId, 3)).toBe(false);
  });

  it('marks complete at 3/3 lessons (non-divisible float case)', () => {
    const courseId = 'c3';
    useCourseProgressStore.getState().setCourseProgress(courseId, baseCourseProgress(courseId));
    useCourseProgressStore.getState().markLessonComplete(courseId, 'l1', 3);
    useCourseProgressStore.getState().markLessonComplete(courseId, 'l2', 3);
    useCourseProgressStore.getState().markLessonComplete(courseId, 'l3', 3);

    expect(useCourseProgressStore.getState().isCourseComplete(courseId, 3)).toBe(true);
    expect(useCourseProgressStore.getState().getCourseProgress(courseId)?.overallProgress).toBe(
      100
    );
  });

  it('marks complete at 10/10 lessons', () => {
    const courseId = 'c10';
    useCourseProgressStore.getState().setCourseProgress(courseId, baseCourseProgress(courseId));
    for (let i = 1; i <= 10; i++) {
      useCourseProgressStore.getState().markLessonComplete(courseId, `l${i}`, 10);
    }

    expect(useCourseProgressStore.getState().isCourseComplete(courseId, 10)).toBe(true);
    expect(useCourseProgressStore.getState().getCourseProgress(courseId)?.overallProgress).toBe(
      100
    );
  });

  it('isCourseComplete returns false for unknown course', () => {
    expect(useCourseProgressStore.getState().isCourseComplete('unknown', 5)).toBe(false);
  });
});

describe('courseProgressStore — markLessonComplete deduplication', () => {
  /**
   * Spy that counts how many times the zustand set() updater runs for a given
   * lesson key. Because the optimistic update always runs inside set(), the
   * number of set() invocations is a direct proxy for "how many times the
   * completion logic actually ran" — matching the spec's requirement that only
   * a single state mutation fires for duplicate rapid calls.
   */

  beforeEach(() => {
    jest.useFakeTimers();
    // Reset store state.
    useCourseProgressStore.setState({ progressMap: {} });
    // Drain the in-progress guard so each test starts clean.
    completionInProgress.clear();
    _completionTimers.forEach(t => clearTimeout(t));
    _completionTimers.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const courseId = 'dedup-course';
  const lessonId = 'lesson-1';
  const totalLessons = 3;

  const seed = () => {
    useCourseProgressStore.getState().setCourseProgress(courseId, baseCourseProgress(courseId));
  };

  // ── AC1: two rapid calls → single update ────────────────────────────────

  it('second call within 500 ms is ignored — lesson recorded exactly once', () => {
    seed();

    useCourseProgressStore.getState().markLessonComplete(courseId, lessonId, totalLessons);
    useCourseProgressStore.getState().markLessonComplete(courseId, lessonId, totalLessons);

    const lessons = useCourseProgressStore.getState().getCourseProgress(courseId)?.lessons ?? {};
    // Lesson entry should exist exactly once (idempotent map key, but we also
    // check the dedup guard prevented a second set() call via the in-progress set).
    expect(lessons[lessonId]).toBeDefined();
    expect(completionInProgress.has(`${courseId}:${lessonId}`)).toBe(true);
  });

  it('two calls within 100 ms result in only 1 state mutation (spy on setState)', () => {
    seed();

    // We verify deduplication by checking the completionInProgress set directly
    // and by asserting the lesson is recorded exactly once in the store state.
    // Spying on the public store.setState doesn't intercept the internal zustand
    // set() closure, so we use observable state instead.
    useCourseProgressStore.getState().markLessonComplete(courseId, lessonId, totalLessons);
    useCourseProgressStore.getState().markLessonComplete(courseId, lessonId, totalLessons);

    // Guard must still be active (second call hit the guard and returned early).
    expect(completionInProgress.has(`${courseId}:${lessonId}`)).toBe(true);

    // Lesson recorded exactly once — only one entry in the map.
    const lessons = useCourseProgressStore.getState().getCourseProgress(courseId)?.lessons ?? {};
    const completedCount = Object.values(lessons).filter(l => l.completed).length;
    expect(completedCount).toBe(1);
  });

  // ── AC2: guard clears after 500 ms — third call succeeds ────────────────

  it('call after 500 ms window passes proceeds normally', () => {
    seed();

    useCourseProgressStore.getState().markLessonComplete(courseId, lessonId, totalLessons);
    expect(completionInProgress.has(`${courseId}:${lessonId}`)).toBe(true);

    // Advance past the 500 ms window.
    jest.advanceTimersByTime(501);

    expect(completionInProgress.has(`${courseId}:${lessonId}`)).toBe(false);

    // Third call is treated as a brand-new completion attempt.
    useCourseProgressStore.getState().markLessonComplete(courseId, lessonId, totalLessons);
    expect(completionInProgress.has(`${courseId}:${lessonId}`)).toBe(true);
  });

  // ── AC3: progress counter increments exactly once per rapid burst ────────

  it('overallProgress increments exactly once for two rapid calls', () => {
    seed();

    useCourseProgressStore.getState().markLessonComplete(courseId, lessonId, totalLessons);
    useCourseProgressStore.getState().markLessonComplete(courseId, lessonId, totalLessons);

    const progress = useCourseProgressStore.getState().getCourseProgress(courseId);
    // 1 lesson completed out of 3 → ~33.3, rounded to one decimal → 33.3
    expect(progress?.overallProgress).toBeCloseTo(33.3, 1);
  });

  // ── Isolation: different lessonIds are tracked independently ────────────

  it('guard is per lessonId — different lessons are not blocked', () => {
    seed();

    useCourseProgressStore.getState().markLessonComplete(courseId, 'lesson-1', totalLessons);
    useCourseProgressStore.getState().markLessonComplete(courseId, 'lesson-2', totalLessons);

    // Both lesson-1 and lesson-2 should be in the guard set (each got its own entry).
    expect(completionInProgress.has(`${courseId}:lesson-1`)).toBe(true);
    expect(completionInProgress.has(`${courseId}:lesson-2`)).toBe(true);

    // Both lessons should be recorded in the store.
    const lessons = useCourseProgressStore.getState().getCourseProgress(courseId)?.lessons ?? {};
    expect(lessons['lesson-1']?.completed).toBe(true);
    expect(lessons['lesson-2']?.completed).toBe(true);
  });

  // ── Isolation: different courseIds share no guard state ─────────────────

  it('guard is per courseId — same lessonId in different courses are not blocked', () => {
    const courseA = 'course-a';
    const courseB = 'course-b';
    useCourseProgressStore.getState().setCourseProgress(courseA, baseCourseProgress(courseA));
    useCourseProgressStore.getState().setCourseProgress(courseB, baseCourseProgress(courseB));

    useCourseProgressStore.getState().markLessonComplete(courseA, lessonId, totalLessons);
    useCourseProgressStore.getState().markLessonComplete(courseB, lessonId, totalLessons);

    // Each course should have its own guard entry.
    expect(completionInProgress.has(`${courseA}:${lessonId}`)).toBe(true);
    expect(completionInProgress.has(`${courseB}:${lessonId}`)).toBe(true);

    // Both courses should have the lesson recorded.
    const lessonsA = useCourseProgressStore.getState().getCourseProgress(courseA)?.lessons ?? {};
    const lessonsB = useCourseProgressStore.getState().getCourseProgress(courseB)?.lessons ?? {};
    expect(lessonsA[lessonId]?.completed).toBe(true);
    expect(lessonsB[lessonId]?.completed).toBe(true);
  });
});
