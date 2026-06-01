import apiClient from '@/services/api/axios.config';
import { clearCache } from '@/services/api/cache';
import { courseApi } from '@/services/api/courseApi';
import { CursorPageResponse } from '@/services/api/cursorPagination';

jest.mock('@/services/api/axios.config', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('courseApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCache();
  });

  it('calls the course page endpoint with cursor parameters', async () => {
    const payload: CursorPageResponse<any> = {
      items: [{ id: 'course-123', title: 'Course 123', description: '', instructor: { id: 'inst-1', name: 'Instructor' }, sections: [], totalLessons: 0, totalDuration: 0, level: 'beginner', category: 'general' }],
      nextCursor: 'abc',
      hasMore: false,
    };

    mockedApiClient.get.mockResolvedValueOnce({ data: payload } as any);

    const result = await courseApi.getCoursesPage({ limit: 10, cursor: 'cursor-abc', orderBy: 'id', direction: 'desc' });

    expect(mockedApiClient.get).toHaveBeenCalledTimes(1);
    expect(mockedApiClient.get).toHaveBeenCalledWith('/courses', {
      params: {
        limit: 10,
        cursor: 'cursor-abc',
        orderBy: 'id',
        direction: 'desc',
      },
    });
    expect(result).toEqual(payload);
  });

  it('reuses cached page data for the same cursor request', async () => {
    const payload: CursorPageResponse<any> = {
      items: [{ id: 'course-456', title: 'Course 456', description: '', instructor: { id: 'inst-2', name: 'Instructor 2' }, sections: [], totalLessons: 0, totalDuration: 0, level: 'intermediate', category: 'design' }],
      nextCursor: null,
      hasMore: false,
    };

    mockedApiClient.get.mockResolvedValueOnce({ data: payload } as any);

    const firstResult = await courseApi.getCoursesPage({ limit: 5, cursor: 'cursor-xyz', orderBy: 'id', direction: 'asc' });
    const secondResult = await courseApi.getCoursesPage({ limit: 5, cursor: 'cursor-xyz', orderBy: 'id', direction: 'asc' });

    expect(mockedApiClient.get).toHaveBeenCalledTimes(1);
    expect(firstResult).toEqual(payload);
    expect(secondResult).toEqual(payload);
  });
});
