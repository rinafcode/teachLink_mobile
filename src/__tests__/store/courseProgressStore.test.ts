import { useCourseProgressStore } from '../../store/courseProgressStore';
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
    expect(useCourseProgressStore.getState().getCourseProgress(courseId)?.overallProgress).toBeLessThan(99.5);
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
    expect(useCourseProgressStore.getState().getCourseProgress(courseId)?.overallProgress).toBe(100);
  });

  it('marks complete at 10/10 lessons', () => {
    const courseId = 'c10';
    useCourseProgressStore.getState().setCourseProgress(courseId, baseCourseProgress(courseId));
    for (let i = 1; i <= 10; i++) {
      useCourseProgressStore.getState().markLessonComplete(courseId, `l${i}`, 10);
    }

    expect(useCourseProgressStore.getState().isCourseComplete(courseId, 10)).toBe(true);
    expect(useCourseProgressStore.getState().getCourseProgress(courseId)?.overallProgress).toBe(100);
  });

  it('isCourseComplete returns false for unknown course', () => {
    expect(useCourseProgressStore.getState().isCourseComplete('unknown', 5)).toBe(false);
  });
});
