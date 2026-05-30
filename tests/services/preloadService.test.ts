import AsyncStorage from '@react-native-async-storage/async-storage';
import { preloadService } from '../../src/services/preloadService';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useCourseProgressStore } from '../../src/store/courseProgressStore';
import { useAppStore } from '../../src/store/index';
import { useQuizStore } from '../../src/store/quizStore';
import { courseApi } from '../../src/services/api/courseApi';
import { userApi } from '../../src/services/api/userApi';
import { ImageCache } from '../../src/utils/imageCache';
import * as Network from 'expo-network';

// Mock offline storage
const asyncStorageStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => Promise.resolve(asyncStorageStore[key] ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      asyncStorageStore[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      delete asyncStorageStore[key];
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      for (const key of Object.keys(asyncStorageStore)) delete asyncStorageStore[key];
      return Promise.resolve();
    }),
  },
}));

// Mock expo-network
jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(() => Promise.resolve({
    isConnected: true,
    isInternetReachable: true,
    type: 'WIFI',
  })),
  NetworkStateType: {
    WIFI: 'WIFI',
    CELLULAR: 'CELLULAR',
    NONE: 'NONE',
  },
}));

// Mock ImageCache
jest.mock('../../src/utils/imageCache', () => ({
  ImageCache: {
    prefetchImages: jest.fn(() => Promise.resolve([true])),
    clearCache: jest.fn(() => Promise.resolve()),
  },
}));

// Mock Course API
jest.mock('../../src/services/api/courseApi', () => ({
  courseApi: {
    getCourses: jest.fn(() => Promise.resolve([])),
    getCourse: jest.fn(() => Promise.resolve({ id: 'course_123', thumbnail: 'https://mock.com/thumb.png' })),
    invalidateCourses: jest.fn(),
    invalidateCourse: jest.fn(),
  },
}));

// Mock User API
jest.mock('../../src/services/api/userApi', () => ({
  userApi: {
    getUser: jest.fn(() => Promise.resolve({ id: 'user_123', name: 'John Doe' })),
    invalidateUser: jest.fn(),
  },
}));

// Mock logger to avoid cluttering test outputs
jest.mock('../../src/utils/logger', () => {
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockLogger,
    logger: mockLogger,
    appLogger: mockLogger,
  };
});

describe('PreloadService', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await preloadService.clearMatrix();
    jest.clearAllMocks();
    
    // Reset stores to default mock structures
    useSettingsStore.setState({ downloadOverWifiOnly: true });
    useCourseProgressStore.setState({
      progressMap: {
        'course_123': {
          courseId: 'course_123',
          currentLessonId: 'lesson_1',
          currentSectionId: 'section_1',
          lessons: {},
          quizzes: {},
          overallProgress: 10,
          lastAccessed: '2026-05-29T09:00:00Z',
          bookmarks: [],
          notes: {},
        },
      },
    });
    useAppStore.setState({
      user: { id: 'user_456', name: 'Test User', email: 'test@example.com' },
    });
  });

  describe('normalizePath', () => {
    it('removes dynamic segments and queries correctly', () => {
      expect(preloadService.normalizePath('/profile/123')).toBe('/profile/[userId]');
      expect(preloadService.normalizePath('/profile/abc-xyz')).toBe('/profile/[userId]');
      expect(preloadService.normalizePath('/course-viewer?courseId=456&lessonId=789')).toBe('/course-viewer');
      expect(preloadService.normalizePath('/settings')).toBe('/settings');
      expect(preloadService.normalizePath(null)).toBe('');
    });
  });

  describe('Transition Pattern Recording and Prediction', () => {
    it('learns transition weights based on navigation frequency', async () => {
      // Record different transitions with distinct weights
      // home -> course-viewer: 3 times
      await preloadService.recordTransition('/(tabs)', '/course-viewer');
      await preloadService.recordTransition('/(tabs)', '/course-viewer');
      await preloadService.recordTransition('/(tabs)', '/course-viewer');
      
      // home -> search: 2 times
      await preloadService.recordTransition('/(tabs)', '/search');
      await preloadService.recordTransition('/(tabs)', '/search');
      
      // home -> settings: 1 time
      await preloadService.recordTransition('/(tabs)', '/settings');

      // Fetch predictions
      const predictions = preloadService.getPredictiveDestinations('/(tabs)', 2);
      
      expect(predictions).toHaveLength(2);
      expect(predictions[0]).toBe('/course-viewer'); // Highest frequency
      expect(predictions[1]).toBe('/search');        // Second highest frequency
    });

    it('falls back to static defaults when navigation history is empty', () => {
      const predictions = preloadService.getPredictiveDestinations('/course-viewer', 2);
      expect(predictions).toContain('/quiz');
      expect(predictions).toContain('/(tabs)');
    });
  });

  describe('Settings and Network Guards', () => {
    it('aborts preloading when network is offline', async () => {
      (Network.getNetworkStateAsync as jest.Mock).mockResolvedValueOnce({
        isConnected: false,
        isInternetReachable: false,
        type: 'NONE',
      });

      const mockRouter = { prefetch: jest.fn() };
      await preloadService.preload('/(tabs)', mockRouter);

      expect(mockRouter.prefetch).not.toHaveBeenCalled();
      expect(courseApi.getCourses).not.toHaveBeenCalled();
    });

    it('aborts preloading on cellular when downloadOverWifiOnly is true', async () => {
      // downloadOverWifiOnly enabled, cellular network connection
      useSettingsStore.setState({ downloadOverWifiOnly: true });
      (Network.getNetworkStateAsync as jest.Mock).mockResolvedValueOnce({
        isConnected: true,
        isInternetReachable: true,
        type: 'CELLULAR',
      });

      const mockRouter = { prefetch: jest.fn() };
      await preloadService.preload('/(tabs)', mockRouter);

      expect(mockRouter.prefetch).not.toHaveBeenCalled();
      expect(courseApi.getCourses).not.toHaveBeenCalled();
    });

    it('permits preloading on cellular when downloadOverWifiOnly is false', async () => {
      useSettingsStore.setState({ downloadOverWifiOnly: false });
      (Network.getNetworkStateAsync as jest.Mock).mockResolvedValueOnce({
        isConnected: true,
        isInternetReachable: true,
        type: 'CELLULAR',
      });

      const mockRouter = { prefetch: jest.fn() };
      await preloadService.preload('/(tabs)', mockRouter);

      // Should run SWR fetches
      expect(courseApi.getCourses).toHaveBeenCalled();
    });
  });

  describe('Multi-tier Resource and Data Prefetching', () => {
    it('executes router bundle prefetching and calls relevant SWR data APIs', async () => {
      // Mock router prefetch
      const mockRouter = { prefetch: jest.fn() };
      
      // We will pretend the next likely destination for home is '/course-viewer' and '/profile/[userId]'
      await preloadService.recordTransition('/(tabs)', '/course-viewer');
      await preloadService.recordTransition('/(tabs)', '/profile/[userId]');

      await preloadService.preload('/(tabs)', mockRouter);

      // Assert router prefetching
      expect(mockRouter.prefetch).toHaveBeenCalledWith('/course-viewer');
      expect(mockRouter.prefetch).toHaveBeenCalledWith('/profile/[userId]');

      // Assert course SWR list fetched
      expect(courseApi.getCourses).toHaveBeenCalled();
      
      // Assert specific active course detail and thumbnail preloaded
      expect(courseApi.getCourse).toHaveBeenCalledWith('course_123');
      
      // Wait for parallel promises in fire-and-forget loops
      await new Promise(process.nextTick);
      expect(ImageCache.prefetchImages).toHaveBeenCalledWith(['https://mock.com/thumb.png']);

      // Assert user details SWR preloaded
      expect(userApi.getUser).toHaveBeenCalledWith('user_456');
    });

    it('triggers quiz session preloading when /quiz is the next destination', async () => {
      const mockRouter = { prefetch: jest.fn() };
      const loadQuizSpy = jest.spyOn(useQuizStore.getState(), 'loadQuizProgress');

      await preloadService.recordTransition('/course-viewer', '/quiz');
      await preloadService.preload('/course-viewer', mockRouter);

      expect(mockRouter.prefetch).toHaveBeenCalledWith('/quiz');
      expect(loadQuizSpy).toHaveBeenCalledWith('course_123');
      
      loadQuizSpy.mockRestore();
    });
  });
});
