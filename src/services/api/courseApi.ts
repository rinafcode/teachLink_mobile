import apiClient from './axios.config';
import { batchClient } from './batchClient';
import { fetchWithSWR, invalidateCacheByTags } from './cache';
import { buildCursorCacheKey, CursorPageRequest, CursorPageResponse } from './cursorPagination';
import { Course } from '../../types/course';

const COURSES_KEY = 'courses:list';
const courseKey = (id: string) => `courses:${id}`;
const COURSE_TAG = 'courses';
const courseTag = (id: string) => `course:${id}`;

// 2 min fresh, 10 min stale window
const TTL = 2 * 60_000;
const STALE_TTL = 10 * 60_000;

export const courseApi = {
  getCourses(): Promise<Course[]> {
    return fetchWithSWR(COURSES_KEY, () => batchClient.get('/courses'), TTL, STALE_TTL, {
      dataType: 'course-list',
      tags: [COURSE_TAG],
      critical: true,
    });
  },

  getCoursesPage(request: CursorPageRequest = {}): Promise<CursorPageResponse<Course>> {
    const { limit = 20, cursor, orderBy = 'id', direction = 'asc' } = request;
    const cacheKey = `courses:${buildCursorCacheKey({ limit, cursor, orderBy, direction })}`;

    return fetchWithSWR(
      cacheKey,
      () =>
        apiClient
          .get<CursorPageResponse<Course>>('/courses', {
            params: { limit, cursor, orderBy, direction },
          })
          .then(r => r.data),
      TTL,
      STALE_TTL,
      {
        dataType: 'course-page',
        tags: [COURSE_TAG],
        critical: true,
      }
    );
  },

  getCourse(id: string): Promise<Course> {
    return fetchWithSWR(courseKey(id), () => batchClient.get(`/courses/${id}`), TTL, STALE_TTL, {
      dataType: 'course-detail',
      tags: [COURSE_TAG, courseTag(id)],
    });
  },

  invalidateCourses(): void {
    invalidateCacheByTags([COURSE_TAG]);
  },

  invalidateCourse(id: string): void {
    invalidateCacheByTags([COURSE_TAG, courseTag(id)]);
  },
};
