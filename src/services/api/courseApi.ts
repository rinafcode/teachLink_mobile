import { CourseSchema } from '../../types/api/schemas';
import { Course } from '../../types/course';
import apiClient from './axios.config';
import { batchClient } from './batchClient';
import { fetchWithSWR, invalidateCacheByTags } from './cache';
import { buildCursorCacheKey, CursorPageRequest, CursorPageResponse } from './cursorPagination';
import { validateResponse } from './validation';

const COURSES_KEY = 'courses:list';
const courseKey = (id: string) => `courses:${id}`;
const COURSE_TAG = 'courses';
const courseTag = (id: string) => `course:${id}`;

// 2 min fresh, 10 min stale window
const TTL = 2 * 60_000;
const STALE_TTL = 10 * 60_000;

export const courseApi = {
  async getCourses(): Promise<Course[]> {
    const response = await fetchWithSWR(COURSES_KEY, () => batchClient.get('/courses'), TTL, STALE_TTL, {
      dataType: 'course-list',
      tags: [COURSE_TAG],
      critical: true,
    });
    return validateResponse(CourseSchema.array(), response, { api: 'getCourses' });
  },

  async getCoursesPage(request: CursorPageRequest = {}): Promise<CursorPageResponse<Course>> {
    const { limit = 20, cursor, orderBy = 'id', direction = 'asc' } = request;
    const cacheKey = `courses:${buildCursorCacheKey({ limit, cursor, orderBy, direction })}`;

    const response = await fetchWithSWR(
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
    return validateResponse(CourseSchema.extend({ data: CourseSchema.array() }), response, { api: 'getCoursesPage' });
  },

  /** Fetch a single course by ID (batched, cached with SWR).
   *  Pass `include` to embed related resources (e.g. `'lessons'`) in the response. */
  async getCourse(id: string, include?: string): Promise<Course> {
    const params = include ? { include } : undefined;
    const cacheKey = params ? `${courseKey(id)}:${JSON.stringify(params)}` : courseKey(id);
    const response = await fetchWithSWR(
      cacheKey,
      () => batchClient.get(`/courses/${id}`, params),
      TTL,
      STALE_TTL,
      {
        dataType: 'course-detail',
        tags: [COURSE_TAG, courseTag(id)],
      }
    );
    return validateResponse(CourseSchema, response, { api: 'getCourse', id });
  },

  invalidateCourses(): void {
    invalidateCacheByTags([COURSE_TAG]);
  },

  invalidateCourse(id: string): void {
    invalidateCacheByTags([COURSE_TAG, courseTag(id)]);
  },
};