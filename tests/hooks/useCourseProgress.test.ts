import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook, act, waitFor } from '@testing-library/react-native';

import { useCourseProgress } from '../../src/hooks/useCourseProgress';

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/services/api/axios.config', () => ({
  __esModule: true,
  default: { patch: jest.fn().mockResolvedValue({ data: {} }) },
}));

jest.mock('../../src/services/api/requestQueue', () => ({
  requestQueue: { addToQueue: jest.fn() },
}));

import apiClient from '../../src/services/api/axios.config';

const mockPatch = apiClient.patch as jest.Mock;
const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

const COURSE_ID = 'course-abc';
const LESSON_ID = 'lesson-1';
const STORAGE_KEY = `course_progress_${COURSE_ID}`;

const makeSavedProgress = (lastPosition = 42) => ({
  courseId: COURSE_ID,
  currentLessonId: LESSON_ID,
  currentSectionId: 's1',
  lessons: {
    [LESSON_ID]: { lessonId: LESSON_ID, completed: false, lastPosition, timeSpent: 0 },
  },
  quizzes: {},
  overallProgress: 0,
  lastAccessed: new Date().toISOString(),
  bookmarks: [],
  notes: {},
});

beforeEach(() => {
  mockGetItem.mockResolvedValue(null);
  mockSetItem.mockResolvedValue(undefined);
  mockPatch.mockClear();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('useCourseProgress', () => {
  describe('initialization', () => {
    it('starts with isLoading=true then resolves', async () => {
      const { result } = renderHook(() => useCourseProgress({ courseId: COURSE_ID }));
      expect(result.current.isLoading).toBe(true);
      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });

    it('restores last saved position from AsyncStorage on init', async () => {
      mockGetItem.mockResolvedValue(JSON.stringify(makeSavedProgress(42)));

      const { result } = renderHook(() => useCourseProgress({ courseId: COURSE_ID }));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.progress?.lessonId).toBe(LESSON_ID);
      expect(result.current.progress?.position).toBe(42);
    });
  });

  describe('updateProgress', () => {
    it('saves progress to AsyncStorage on update', async () => {
      const { result } = renderHook(() => useCourseProgress({ courseId: COURSE_ID }));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        result.current.updateProgress(LESSON_ID, 99);
      });

      const calls = mockSetItem.mock.calls.filter(([key]: [string]) => key === STORAGE_KEY);
      expect(calls.length).toBeGreaterThan(0);
      const saved = JSON.parse(calls[calls.length - 1][1]);
      expect(saved.lessons[LESSON_ID].lastPosition).toBe(99);
    });

    it('updates the in-memory state with new progress data', async () => {
      const { result } = renderHook(() => useCourseProgress({ courseId: COURSE_ID }));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        result.current.updateProgress(LESSON_ID, 55);
      });

      expect(result.current.fullProgress?.lessons[LESSON_ID]?.lastPosition).toBe(55);
    });
  });

  describe('server sync', () => {
    it('does NOT call server sync before debounce delay', async () => {
      const { result } = renderHook(() => useCourseProgress({ courseId: COURSE_ID }));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => { result.current.updateProgress(LESSON_ID, 10); });

      act(() => { jest.advanceTimersByTime(1000); });
      expect(mockPatch).not.toHaveBeenCalled();
    });

    it('calls PATCH /api/progress/:courseId after debounce delay', async () => {
      const { result } = renderHook(() => useCourseProgress({ courseId: COURSE_ID }));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => { result.current.updateProgress(LESSON_ID, 10); });

      act(() => { jest.advanceTimersByTime(2000); });
      await waitFor(() => expect(mockPatch).toHaveBeenCalledTimes(1));

      expect(mockPatch).toHaveBeenCalledWith(
        `/api/progress/${COURSE_ID}`,
        expect.objectContaining({ courseId: COURSE_ID }),
      );
    });

    it('debounces multiple rapid updates into a single sync call', async () => {
      const { result } = renderHook(() => useCourseProgress({ courseId: COURSE_ID }));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        result.current.updateProgress(LESSON_ID, 1);
        result.current.updateProgress(LESSON_ID, 2);
        result.current.updateProgress(LESSON_ID, 3);
      });

      act(() => { jest.advanceTimersByTime(2000); });
      await waitFor(() => expect(mockPatch).toHaveBeenCalledTimes(1));
    });
  });

  describe('resume', () => {
    it('exposes the last saved position so the user can resume', async () => {
      mockGetItem.mockResolvedValue(JSON.stringify(makeSavedProgress(120)));

      const { result } = renderHook(() => useCourseProgress({ courseId: COURSE_ID }));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.progress?.position).toBe(120);
    });
  });
});
