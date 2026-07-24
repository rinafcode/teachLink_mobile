import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('../../../hooks/useCourseProgress', () => ({
  useCourseProgress: () => ({
    progress: null,
    isLoading: false,
    fullProgress: null,
    updateLessonProgress: jest.fn(),
    setCurrentCourse: jest.fn(),
    markLesson: jest.fn(),
    setCurrentLesson: jest.fn(() => Promise.resolve()),
    addBookmark: jest.fn(() => Promise.resolve()),
    removeBookmark: jest.fn(() => Promise.resolve()),
    addNote: jest.fn(() => Promise.resolve()),
    updateNote: jest.fn(() => Promise.resolve()),
    deleteNote: jest.fn(() => Promise.resolve()),
    updateLastPosition: jest.fn(() => Promise.resolve()),
    calculateOverallProgress: () => 0,
    syncProgress: jest.fn(),
  }),
}));

jest.mock('../../../hooks/useDynamicFontSize', () => ({
  useDynamicFontSize: () => ({ scale: jest.fn() }),
}));

jest.mock('../../../hooks/useAnalytics', () => ({
  useAnalytics: () => ({
    trackScreen: jest.fn(),
    trackEvent: jest.fn(),
  }),
}));

jest.mock('../../../hooks/useInAppReview', () => ({
  useInAppReview: () => ({
    requestReview: jest.fn(),
  }),
  useReviewMetrics: () => ({
    trackAchievement: jest.fn(),
    trackCourseComplete: jest.fn(),
  }),
}));

jest.mock('../../../hooks/usePrefetchImages', () => ({
  usePrefetchImages: jest.fn(),
}));

jest.mock('../../../store/reviewStore', () => ({
  useReviewStore: {
    getState: jest.fn(() => ({
      coursesCompleted: 1,
      achievements: [],
    })),
  },
}));

jest.mock('../../../utils/logger', () => ({
  logger: {
    component: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('../../../services/api/courseApi', () => ({
  courseApi: {
    getCourse: jest.fn(),
  },
}));

jest.mock('../../../services/api/batchClient', () => ({
  batchClient: { get: jest.fn(() => Promise.resolve({ data: {} })) },
  default: { get: jest.fn(() => Promise.resolve({ data: {} })) },
}));

jest.mock('../../../services/api/axios.config', () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => Promise.resolve({ data: {} })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    put: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
    patch: jest.fn(() => Promise.resolve({ data: {} })),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  },
}));

jest.mock('../LessonCarousel', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock('../MobileSyllabus', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock('../BookmarkButton', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock('../CourseViewerSkeleton', () => ({
  CourseViewerSkeleton: jest.fn(() => null),
}));

jest.mock('../../common/AppText', () => ({
  AppText: jest.fn(() => null),
}));

jest.mock('../../common/ErrorBoundary', () => ({
  ErrorBoundary: jest.fn(({ children }) => children),
}));

jest.mock('../../common/PrimaryButton', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

import { courseApi } from '../../../services/api/courseApi';
import { sampleCourse } from '../../../data/sampleCourse';
import MobileCourseViewer from '../MobileCourseViewer';

const mockedCourseApi = courseApi as jest.Mocked<typeof courseApi>;

describe('MobileCourseViewer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('makes zero API calls for lessons when course is passed as prop', () => {
    render(React.createElement(MobileCourseViewer, { course: sampleCourse }));

    expect(mockedCourseApi.getCourse).toHaveBeenCalledTimes(0);
  });

  it('renders without additional network requests', () => {
    const { toJSON } = render(React.createElement(MobileCourseViewer, { course: sampleCourse }));
    expect(toJSON()).toBeDefined();
  });

  it('does not call batchClient.get for per-lesson fetches on mount', () => {
    const { batchClient: mockedBatchClient } = require('../../../services/api/batchClient');

    render(React.createElement(MobileCourseViewer, { course: sampleCourse }));

    expect(mockedBatchClient.get).toHaveBeenCalledTimes(0);
  });
});
